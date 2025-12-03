import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

export interface BackupInfo {
  id: string;
  filename: string;
  size: number;
  createdAt: Date;
  type: 'auto' | 'manual';
  status: 'success' | 'failed';
  errorMessage?: string;
  path?: string;
}

export class BackupService {
  private static backupDir = process.env.BACKUP_DIR || './backups';
  private static retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30');
  private static maxBackups = parseInt(process.env.BACKUP_MAX_COUNT || '50');

  // Assicura che la directory di backup esista
  private static async ensureBackupDir(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  // Crea un backup del database PostgreSQL
  static async createDatabaseBackup(adminId?: string, isManual: boolean = false): Promise<BackupInfo> {
    await this.ensureBackupDir();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const filename = `calendariko_backup_${timestamp}.sql`;
    const fullPath = path.join(this.backupDir, filename);
    
    const backup: BackupInfo = {
      id: `backup_${Date.now()}`,
      filename,
      size: 0,
      createdAt: new Date(),
      type: isManual ? 'manual' : 'auto',
      status: 'failed', // Inizialmente failed, aggiorniamo su successo
      path: fullPath,
    };

    try {
      // Ottieni i parametri di connessione dal DATABASE_URL
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL non configurata');
      }

      // Parse DATABASE_URL per ottenere i parametri di connessione
      const url = new URL(dbUrl);
      const dbName = url.pathname.slice(1); // Rimuovi il '/' iniziale
      const host = url.hostname;
      const port = url.port || '5432';
      const username = url.username;
      const password = url.password;

      // Comando pg_dump per creare il backup
      const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --clean --create --if-exists -f "${fullPath}"`;
      
      console.log(`Avvio backup database: ${filename}`);
      
      // Esegui pg_dump
      const { stdout, stderr } = await execAsync(pgDumpCommand, {
        env: { ...process.env, PGPASSWORD: password },
        timeout: 300000 // 5 minuti timeout
      });

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('Backup warnings:', stderr);
      }

      // Verifica che il file sia stato creato e ottieni le dimensioni
      const stats = await fs.stat(fullPath);
      backup.size = stats.size;
      backup.status = 'success';

      console.log(`✅ Backup completato: ${filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);

      // Log audit se è un backup manuale
      if (isManual && adminId) {
        await AuditService.logAction({
          action: 'CREATE_DATABASE_BACKUP',
          entity: 'SYSTEM',
          adminId,
          details: {
            filename,
            size: backup.size,
            type: 'manual'
          },
          success: true
        });
      }

      // Cleanup vecchi backup
      await this.cleanupOldBackups();

      return backup;
    } catch (error: any) {
      console.error('❌ Errore durante il backup:', error.message);
      backup.errorMessage = error.message;
      
      // Log audit dell'errore se è un backup manuale
      if (isManual && adminId) {
        await AuditService.logAction({
          action: 'CREATE_DATABASE_BACKUP',
          entity: 'SYSTEM',
          adminId,
          details: {
            filename,
            error: error.message,
            type: 'manual'
          },
          success: false,
          errorMessage: error.message
        });
      }

      // Rimuovi file parziale se esiste
      try {
        await fs.unlink(fullPath);
      } catch {}

      throw error;
    }
  }

  // Lista tutti i backup disponibili
  static async listBackups(): Promise<BackupInfo[]> {
    await this.ensureBackupDir();
    
    try {
      const files = await fs.readdir(this.backupDir);
      const backups: BackupInfo[] = [];

      for (const file of files) {
        if (file.endsWith('.sql')) {
          const fullPath = path.join(this.backupDir, file);
          try {
            const stats = await fs.stat(fullPath);
            const timestampMatch = file.match(/calendariko_backup_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})\.sql/);
            
            backups.push({
              id: `backup_${stats.mtimeMs}`,
              filename: file,
              size: stats.size,
              createdAt: stats.mtime,
              type: 'auto', // Non possiamo distinguere dal filename
              status: 'success',
              path: fullPath,
            });
          } catch (error) {
            console.warn(`Errore lettura backup ${file}:`, error);
          }
        }
      }

      // Ordina per data decrescente (più recenti prima)
      return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Errore lettura directory backup:', error);
      return [];
    }
  }

  // Pulisce i backup vecchi in base alle policy di retention
  static async cleanupOldBackups(): Promise<{ removed: number; kept: number }> {
    const backups = await this.listBackups();
    let removed = 0;
    let kept = 0;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    for (const backup of backups) {
      const shouldRemove = (
        // Rimuovi se più vecchio della retention
        backup.createdAt < cutoffDate ||
        // Oppure se supera il numero massimo (mantieni solo i più recenti)
        kept >= this.maxBackups
      );

      if (shouldRemove && backup.path) {
        try {
          await fs.unlink(backup.path);
          console.log(`🗑️ Rimosso backup vecchio: ${backup.filename}`);
          removed++;
        } catch (error) {
          console.error(`Errore rimozione backup ${backup.filename}:`, error);
        }
      } else {
        kept++;
      }
    }

    console.log(`🧹 Cleanup backup completato: ${removed} rimossi, ${kept} mantenuti`);
    return { removed, kept };
  }

  // Verifica l'integrità di un backup
  static async verifyBackup(backupPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Controllo base: il file esiste e ha dimensioni > 0
      const stats = await fs.stat(backupPath);
      if (stats.size === 0) {
        return { valid: false, error: 'File backup vuoto' };
      }

      // Controllo contenuto: deve contenere comandi SQL validi
      const content = await fs.readFile(backupPath, 'utf-8');
      const hasCreateDatabase = content.includes('CREATE DATABASE');
      const hasCreateTable = content.includes('CREATE TABLE');
      
      if (!hasCreateTable) {
        return { valid: false, error: 'Backup non contiene definizioni di tabelle' };
      }

      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }

  // Ripristina database da backup (ATTENZIONE: operazione distruttiva)
  static async restoreFromBackup(backupPath: string, adminId: string): Promise<void> {
    console.log(`⚠️ ATTENZIONE: Ripristino database da ${path.basename(backupPath)}`);
    
    try {
      // Verifica integrità backup prima del ripristino
      const verification = await this.verifyBackup(backupPath);
      if (!verification.valid) {
        throw new Error(`Backup non valido: ${verification.error}`);
      }

      // Ottieni i parametri di connessione
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        throw new Error('DATABASE_URL non configurata');
      }

      const url = new URL(dbUrl);
      const dbName = url.pathname.slice(1);
      const host = url.hostname;
      const port = url.port || '5432';
      const username = url.username;
      const password = url.password;

      // Comando psql per ripristinare il backup
      const restoreCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${username} -d ${dbName} -f "${backupPath}"`;
      
      console.log('🔄 Avvio ripristino database...');
      
      // Esegui ripristino
      const { stdout, stderr } = await execAsync(restoreCommand, {
        env: { ...process.env, PGPASSWORD: password },
        timeout: 600000 // 10 minuti timeout
      });

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('Restore warnings:', stderr);
      }

      console.log('✅ Ripristino database completato');

      // Log audit del ripristino
      await AuditService.logAction({
        action: 'RESTORE_DATABASE_BACKUP',
        entity: 'SYSTEM',
        adminId,
        details: {
          backupFile: path.basename(backupPath),
          timestamp: new Date().toISOString()
        },
        success: true
      });

    } catch (error: any) {
      console.error('❌ Errore durante il ripristino:', error.message);
      
      // Log audit dell'errore
      await AuditService.logAction({
        action: 'RESTORE_DATABASE_BACKUP',
        entity: 'SYSTEM',
        adminId,
        details: {
          backupFile: path.basename(backupPath),
          error: error.message,
          timestamp: new Date().toISOString()
        },
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }

  // Ottieni statistiche sui backup
  static async getBackupStats(): Promise<{
    totalBackups: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
    avgSizeBytes: number;
  }> {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      return {
        totalBackups: 0,
        totalSize: 0,
        avgSizeBytes: 0
      };
    }

    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const oldestBackup = backups[backups.length - 1]?.createdAt;
    const newestBackup = backups[0]?.createdAt;

    return {
      totalBackups: backups.length,
      totalSize,
      oldestBackup,
      newestBackup,
      avgSizeBytes: Math.round(totalSize / backups.length)
    };
  }

  // Elimina un backup specifico
  static async deleteBackup(backupId: string, adminId: string): Promise<void> {
    const backups = await this.listBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup || !backup.path) {
      throw new Error('Backup non trovato');
    }

    try {
      await fs.unlink(backup.path);
      console.log(`🗑️ Backup eliminato: ${backup.filename}`);

      // Log audit
      await AuditService.logAction({
        action: 'DELETE_DATABASE_BACKUP',
        entity: 'SYSTEM',
        adminId,
        details: {
          filename: backup.filename,
          size: backup.size
        },
        success: true
      });
    } catch (error: any) {
      // Log audit dell'errore
      await AuditService.logAction({
        action: 'DELETE_DATABASE_BACKUP',
        entity: 'SYSTEM',
        adminId,
        details: {
          filename: backup.filename,
          error: error.message
        },
        success: false,
        errorMessage: error.message
      });

      throw error;
    }
  }
}