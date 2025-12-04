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
    console.log('🔧 Iniziando creazione backup database...');
    
    try {
      await this.ensureBackupDir();
      console.log('📁 Directory backup verificata');
    } catch (dirError) {
      console.error('❌ Errore creazione directory backup:', dirError);
      throw new Error(`Impossibile creare directory backup: ${dirError}`);
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                     new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
    const filename = `calendariko_backup_${timestamp}.sql`;
    const fullPath = path.join(this.backupDir, filename);
    
    console.log(`📄 Nome file backup: ${filename}`);
    console.log(`📍 Percorso completo: ${fullPath}`);
    
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
      console.log('🔗 DATABASE_URL presente');

      // Parse DATABASE_URL per ottenere i parametri di connessione
      let url: URL;
      try {
        url = new URL(dbUrl);
      } catch (urlError) {
        throw new Error(`DATABASE_URL non valida: ${urlError}`);
      }
      
      const dbName = url.pathname.slice(1); // Rimuovi il '/' iniziale
      const host = url.hostname;
      const port = url.port || '5432';
      const username = url.username;
      const password = url.password;

      console.log(`📊 Parametri connessione: host=${host}, port=${port}, db=${dbName}, user=${username}`);

      // Verifica che pg_dump sia disponibile, altrimenti usa fallback
      let usePgDump = true;
      try {
        await execAsync('pg_dump --version');
        console.log('✅ pg_dump disponibile');
      } catch (pgDumpError) {
        console.warn('⚠️ pg_dump non trovato:', pgDumpError);
        console.log('🔄 Usando fallback: backup dati via Prisma');
        usePgDump = false;
      }

      if (usePgDump) {
        // Usa pg_dump per backup completo
        const pgDumpCommand = `PGPASSWORD="${password}" pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --clean --create --if-exists -f "${fullPath}"`;
        
        console.log(`🚀 Avvio backup database: ${filename}`);
        console.log(`🔧 Comando: pg_dump -h ${host} -p ${port} -U ${username} -d ${dbName} --clean --create --if-exists -f "${fullPath}"`);
        
        // Esegui pg_dump
        const { stdout, stderr } = await execAsync(pgDumpCommand, {
          env: { ...process.env, PGPASSWORD: password },
          timeout: 300000 // 5 minuti timeout
        });

        console.log('📤 pg_dump completato');
        if (stdout) console.log('stdout:', stdout);
        if (stderr) {
          if (stderr.includes('NOTICE')) {
            console.log('Notice messages:', stderr);
          } else {
            console.warn('⚠️ stderr:', stderr);
          }
        }
      } else {
        // Fallback: backup via Prisma (solo dati, non schema)
        console.log(`🚀 Avvio backup fallback: ${filename}`);
        await this.createPrismaBackup(fullPath);
        console.log('📤 Backup Prisma completato');
      }

      // Verifica che il file sia stato creato e ottieni le dimensioni
      try {
        const stats = await fs.stat(fullPath);
        backup.size = stats.size;
        backup.status = 'success';
        console.log(`📏 File backup creato: ${backup.size} bytes (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);
        
        if (backup.size === 0) {
          throw new Error('File backup vuoto');
        }
      } catch (statError) {
        throw new Error(`File backup non creato correttamente: ${statError}`);
      }

      console.log(`✅ Backup completato: ${filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);

      // Log audit se è un backup manuale
      if (isManual && adminId) {
        try {
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
          console.log('📝 Audit log registrato');
        } catch (auditError) {
          console.warn('⚠️ Errore audit log:', auditError);
          // Non bloccare il backup per errori di audit
        }
      }

      // Cleanup vecchi backup
      try {
        await this.cleanupOldBackups();
        console.log('🧹 Cleanup completato');
      } catch (cleanupError) {
        console.warn('⚠️ Errore cleanup:', cleanupError);
        // Non bloccare il backup per errori di cleanup
      }

      return backup;
    } catch (error: any) {
      console.error('❌ Errore durante il backup:', error.message);
      console.error('❌ Stack trace:', error.stack);
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

      // Leggi contenuto file
      const content = await fs.readFile(backupPath, 'utf-8');
      
      // Determina il tipo di backup
      if (content.startsWith('{') && content.includes('"metadata"')) {
        // Backup JSON (Prisma fallback)
        try {
          const backupData = JSON.parse(content);
          
          if (!backupData.metadata || !backupData.data) {
            return { valid: false, error: 'Backup JSON non ha struttura valida' };
          }
          
          if (!backupData.data.users || !Array.isArray(backupData.data.users)) {
            return { valid: false, error: 'Backup JSON non contiene dati utenti validi' };
          }
          
          console.log(`✅ Backup JSON verificato: ${backupData.counts?.users || 0} utenti`);
          return { valid: true };
          
        } catch (jsonError) {
          return { valid: false, error: 'Backup JSON malformato' };
        }
      } else {
        // Backup SQL (pg_dump)
        const hasCreateTable = content.includes('CREATE TABLE') || content.includes('CREATE SCHEMA');
        
        if (!hasCreateTable) {
          return { valid: false, error: 'Backup SQL non contiene definizioni di tabelle' };
        }
        
        console.log('✅ Backup SQL verificato');
        return { valid: true };
      }
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

  // Fallback: Backup via Prisma (solo dati, non schema completo)
  private static async createPrismaBackup(filePath: string): Promise<void> {
    console.log('🔄 Creando backup fallback via Prisma...');
    
    try {
      // Recupera tutti i dati dal database
      const users = await prisma.user.findMany({
        include: {
          groupMemberships: true,
          events: true,
          availabilities: true,
          notifications: true,
          createdGroups: true,
          auditLogs: true,
        }
      });
      
      const groups = await prisma.group.findMany({
        include: {
          members: true,
          events: true,
        }
      });
      
      const events = await prisma.event.findMany({
        include: {
          group: true,
          user: true,
        }
      });
      
      const availabilities = await prisma.availability.findMany({
        include: {
          user: true,
          group: true,
        }
      });
      
      const notifications = await prisma.notification.findMany({
        include: {
          user: true,
        }
      });
      
      const auditLogs = await prisma.auditLog.findMany({
        include: {
          admin: true,
        }
      });
      
      // Crea oggetto backup con tutti i dati
      const backupData = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          type: 'prisma_fallback',
          description: 'Backup dati via Prisma (fallback quando pg_dump non disponibile)'
        },
        data: {
          users,
          groups,
          events,
          availabilities,
          notifications,
          auditLogs,
        },
        counts: {
          users: users.length,
          groups: groups.length,
          events: events.length,
          availabilities: availabilities.length,
          notifications: notifications.length,
          auditLogs: auditLogs.length,
        }
      };
      
      // Scrivi il backup come JSON
      const jsonData = JSON.stringify(backupData, null, 2);
      await fs.writeFile(filePath, jsonData, 'utf8');
      
      console.log('✅ Backup Prisma creato con successo');
      console.log(`📊 Dati salvati: ${backupData.counts.users} users, ${backupData.counts.groups} groups, ${backupData.counts.events} events`);
      
    } catch (error) {
      console.error('❌ Errore backup Prisma:', error);
      throw new Error(`Fallback backup failed: ${error}`);
    }
  }
}