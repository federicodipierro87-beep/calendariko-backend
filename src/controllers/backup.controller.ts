import { Request, Response } from 'express';
import { BackupService } from '../services/backup.service';
import { SchedulerService } from '../services/scheduler.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export class BackupController {
  // Crea un backup manuale
  static async createBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono creare backup
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono creare backup.' });
        return;
      }

      console.log(`📦 Richiesta backup manuale da admin: ${req.user.email}`);
      
      const backup = await BackupService.createDatabaseBackup(req.user.id, true);
      
      res.status(201).json({
        success: true,
        data: {
          id: backup.id,
          filename: backup.filename,
          size: backup.size,
          createdAt: backup.createdAt,
          type: backup.type,
          status: backup.status
        },
        message: 'Backup creato con successo'
      });
    } catch (error: any) {
      console.error('Errore creazione backup:', error);
      res.status(500).json({
        error: 'Errore durante la creazione del backup',
        details: error.message
      });
    }
  }

  // Lista tutti i backup disponibili
  static async getBackups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono vedere i backup
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono visualizzare i backup.' });
        return;
      }

      const backups = await BackupService.listBackups();
      
      res.status(200).json({
        success: true,
        data: backups.map(backup => ({
          id: backup.id,
          filename: backup.filename,
          size: backup.size,
          sizeFormatted: `${(backup.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: backup.createdAt,
          type: backup.type,
          status: backup.status
        }))
      });
    } catch (error: any) {
      console.error('Errore recupero backup:', error);
      res.status(500).json({
        error: 'Errore durante il recupero dei backup',
        details: error.message
      });
    }
  }

  // Ottieni statistiche sui backup
  static async getBackupStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono vedere le statistiche
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono visualizzare le statistiche.' });
        return;
      }

      const stats = await BackupService.getBackupStats();
      const scheduleStatus = SchedulerService.getBackupScheduleStatus();
      
      res.status(200).json({
        success: true,
        data: {
          ...stats,
          totalSizeFormatted: `${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`,
          avgSizeFormatted: `${(stats.avgSizeBytes / 1024 / 1024).toFixed(2)} MB`,
          scheduling: scheduleStatus
        }
      });
    } catch (error: any) {
      console.error('Errore recupero statistiche backup:', error);
      res.status(500).json({
        error: 'Errore durante il recupero delle statistiche',
        details: error.message
      });
    }
  }

  // Elimina un backup specifico
  static async deleteBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono eliminare backup
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono eliminare backup.' });
        return;
      }

      const { backupId } = req.params;
      
      if (!backupId) {
        res.status(400).json({ error: 'ID backup richiesto' });
        return;
      }

      await BackupService.deleteBackup(backupId, req.user.id);
      
      res.status(200).json({
        success: true,
        message: 'Backup eliminato con successo'
      });
    } catch (error: any) {
      console.error('Errore eliminazione backup:', error);
      
      if (error.message === 'Backup non trovato') {
        res.status(404).json({ error: 'Backup non trovato' });
      } else {
        res.status(500).json({
          error: 'Errore durante l\'eliminazione del backup',
          details: error.message
        });
      }
    }
  }

  // Verifica l'integrità di un backup
  static async verifyBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono verificare backup
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono verificare backup.' });
        return;
      }

      const { backupId } = req.params;
      
      const backups = await BackupService.listBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup || !backup.path) {
        res.status(404).json({ error: 'Backup non trovato' });
        return;
      }

      const verification = await BackupService.verifyBackup(backup.path);
      
      res.status(200).json({
        success: true,
        data: {
          backupId,
          filename: backup.filename,
          valid: verification.valid,
          error: verification.error
        }
      });
    } catch (error: any) {
      console.error('Errore verifica backup:', error);
      res.status(500).json({
        error: 'Errore durante la verifica del backup',
        details: error.message
      });
    }
  }

  // Esegui cleanup manuale dei backup vecchi
  static async cleanupBackups(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono eseguire cleanup
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono eseguire il cleanup.' });
        return;
      }

      console.log(`🧹 Richiesta cleanup backup da admin: ${req.user.email}`);
      
      const result = await BackupService.cleanupOldBackups();
      
      res.status(200).json({
        success: true,
        data: result,
        message: `Cleanup completato: ${result.removed} backup rimossi, ${result.kept} mantenuti`
      });
    } catch (error: any) {
      console.error('Errore cleanup backup:', error);
      res.status(500).json({
        error: 'Errore durante il cleanup dei backup',
        details: error.message
      });
    }
  }

  // Ottieni configurazione scheduling backup
  static async getScheduleConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono vedere la configurazione
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono visualizzare la configurazione.' });
        return;
      }

      const scheduleStatus = SchedulerService.getBackupScheduleStatus();
      
      res.status(200).json({
        success: true,
        data: {
          ...scheduleStatus,
          retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
          maxBackups: parseInt(process.env.BACKUP_MAX_COUNT || '50'),
          notificationsEnabled: process.env.BACKUP_NOTIFICATIONS_ENABLED === 'true',
          notificationEmail: process.env.BACKUP_NOTIFICATION_EMAIL || null
        }
      });
    } catch (error: any) {
      console.error('Errore recupero configurazione:', error);
      res.status(500).json({
        error: 'Errore durante il recupero della configurazione',
        details: error.message
      });
    }
  }

  // Test del sistema di backup
  static async testBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono testare il sistema
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono testare il sistema.' });
        return;
      }

      console.log(`🧪 Test sistema backup da admin: ${req.user.email}`);
      
      // Verifica configurazione prima del test
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) {
        res.status(500).json({
          error: 'DATABASE_URL non configurata',
          details: 'La variabile d\'ambiente DATABASE_URL è richiesta per i backup'
        });
        return;
      }

      console.log('📋 Configurazione DATABASE_URL presente');
      console.log('🔧 Tentativo test backup...');
      
      await SchedulerService.testBackup();
      
      res.status(200).json({
        success: true,
        message: 'Test del sistema di backup completato con successo'
      });
    } catch (error: any) {
      console.error('❌ Errore test backup:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        error: 'Errore durante il test del sistema di backup',
        details: error.message,
        suggestion: 'Verificare che pg_dump sia installato e accessibile, e che DATABASE_URL sia configurata correttamente'
      });
    }
  }

  // Ripristina database da backup (ATTENZIONE: operazione distruttiva)
  static async restoreBackup(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Solo admin possono ripristinare
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Accesso negato. Solo gli admin possono ripristinare backup.' });
        return;
      }

      const { backupId } = req.params;
      const { confirmRestore } = req.body;
      
      if (!confirmRestore) {
        res.status(400).json({ 
          error: 'Conferma richiesta. Il ripristino sovrascriverà tutti i dati attuali del database.' 
        });
        return;
      }
      
      const backups = await BackupService.listBackups();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup || !backup.path) {
        res.status(404).json({ error: 'Backup non trovato' });
        return;
      }

      console.log(`⚠️ RIPRISTINO DATABASE da admin: ${req.user.email} con backup: ${backup.filename}`);
      
      await BackupService.restoreFromBackup(backup.path, req.user.id);
      
      res.status(200).json({
        success: true,
        message: `Database ripristinato da backup: ${backup.filename}`,
        warning: 'Il database è stato completamente ripristinato. Tutte le modifiche successive al backup sono state perse.'
      });
    } catch (error: any) {
      console.error('Errore ripristino backup:', error);
      res.status(500).json({
        error: 'Errore durante il ripristino del backup',
        details: error.message
      });
    }
  }
}