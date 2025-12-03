import * as cron from 'node-cron';
import { BackupService } from './backup.service';

export class SchedulerService {
  private static backupTask: cron.ScheduledTask | null = null;

  // Avvia il servizio di scheduling
  static start(): void {
    console.log('🕒 Avvio servizio scheduling...');
    
    // Avvia il backup automatico se abilitato
    this.startBackupScheduling();
    
    console.log('✅ Servizio scheduling attivo');
  }

  // Avvia la schedulazione dei backup automatici
  private static startBackupScheduling(): void {
    // Leggi configurazione da variabili d'ambiente
    const enabled = process.env.BACKUP_AUTO_ENABLED === 'true';
    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // Default: ogni giorno alle 2:00
    
    if (!enabled) {
      console.log('📦 Backup automatici disabilitati');
      return;
    }

    // Valida il cron expression
    if (!cron.validate(schedule)) {
      console.error(`❌ Cron expression non valida: ${schedule}`);
      return;
    }

    console.log(`📦 Configurazione backup automatici: ${schedule}`);
    
    // Programma il task di backup
    this.backupTask = cron.schedule(schedule, async () => {
      console.log('🔄 Avvio backup automatico programmato...');
      
      try {
        const backup = await BackupService.createDatabaseBackup(undefined, false);
        console.log(`✅ Backup automatico completato: ${backup.filename} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);
        
        // Invia notifica di successo se configurato
        await this.sendBackupNotification('success', backup);
        
      } catch (error: any) {
        console.error('❌ Errore backup automatico:', error.message);
        
        // Invia notifica di errore se configurato
        await this.sendBackupNotification('error', undefined, error.message);
      }
    });

    // Avvia il task
    this.backupTask.start();

    console.log(`✅ Backup automatici programmati: ${schedule}`);
  }

  // Ferma la schedulazione dei backup
  static stopBackupScheduling(): void {
    if (this.backupTask) {
      this.backupTask.stop();
      this.backupTask = null;
      console.log('🛑 Backup automatici fermati');
    }
  }

  // Riavvia la schedulazione dei backup (utile dopo cambio configurazione)
  static restartBackupScheduling(): void {
    this.stopBackupScheduling();
    this.startBackupScheduling();
  }

  // Invia notifica per il risultato del backup (email o altro sistema)
  private static async sendBackupNotification(
    type: 'success' | 'error', 
    backup?: any, 
    error?: string
  ): Promise<void> {
    try {
      // Controlla se le notifiche sono abilitate
      const notificationsEnabled = process.env.BACKUP_NOTIFICATIONS_ENABLED === 'true';
      if (!notificationsEnabled) return;

      const notificationEmail = process.env.BACKUP_NOTIFICATION_EMAIL;
      if (!notificationEmail) return;

      // Importa il servizio email dinamicamente per evitare circular dependencies
      try {
        const emailService = require('./email.service');
        
        if (type === 'success' && backup) {
          await emailService.EmailService.sendEmail({
            to: notificationEmail,
            subject: '✅ Backup Database Completato - Calendariko',
            html: `
              <h2>Backup Database Completato</h2>
              <p>Il backup automatico del database è stato completato con successo.</p>
              <ul>
                <li><strong>File:</strong> ${backup.filename}</li>
                <li><strong>Dimensione:</strong> ${(backup.size / 1024 / 1024).toFixed(2)} MB</li>
                <li><strong>Data:</strong> ${backup.createdAt.toLocaleString('it-IT')}</li>
              </ul>
              <p><em>Sistema Calendariko - Backup Automatico</em></p>
            `
          });
        } else if (type === 'error') {
          await emailService.EmailService.sendEmail({
            to: notificationEmail,
            subject: '❌ Errore Backup Database - Calendariko',
            html: `
              <h2>Errore nel Backup Database</h2>
              <p>Si è verificato un errore durante il backup automatico del database.</p>
              <p><strong>Errore:</strong> ${error}</p>
              <p><strong>Data:</strong> ${new Date().toLocaleString('it-IT')}</p>
              <p>Si consiglia di verificare la configurazione del sistema e riprovare manualmente.</p>
              <p><em>Sistema Calendariko - Backup Automatico</em></p>
            `
          });
        }
      } catch (importError) {
        console.warn('EmailService non disponibile, notifica email saltata:', importError);
        return;
      }
    } catch (notificationError) {
      console.error('Errore invio notifica backup:', notificationError);
    }
  }

  // Ottieni lo stato della schedulazione
  static getBackupScheduleStatus(): {
    enabled: boolean;
    schedule?: string;
    nextRun?: Date;
    timezone: string;
  } {
    const enabled = process.env.BACKUP_AUTO_ENABLED === 'true';
    const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';
    const timezone = process.env.TZ || 'Europe/Rome';
    
    let nextRun: Date | undefined;
    if (this.backupTask && enabled) {
      try {
        // Per node-cron v4+, non è disponibile nextDate()
        // Lasciamo undefined per ora
        nextRun = undefined;
      } catch (error) {
        console.warn('Errore calcolo prossima esecuzione:', error);
      }
    }

    return {
      enabled,
      schedule: enabled ? schedule : undefined,
      nextRun,
      timezone
    };
  }

  // Ferma tutti i task di scheduling
  static stop(): void {
    console.log('🛑 Fermando servizio scheduling...');
    
    this.stopBackupScheduling();
    
    console.log('✅ Servizio scheduling fermato');
  }

  // Test del backup manuale (utile per debugging)
  static async testBackup(): Promise<void> {
    console.log('🧪 Test backup manuale...');
    
    try {
      const backup = await BackupService.createDatabaseBackup(undefined, false);
      console.log(`✅ Test backup completato: ${backup.filename}`);
      
      // Test notifica
      await this.sendBackupNotification('success', backup);
      
    } catch (error: any) {
      console.error('❌ Test backup fallito:', error.message);
      await this.sendBackupNotification('error', undefined, error.message);
      throw error;
    }
  }
}

// Gestione graceful shutdown
process.on('SIGINT', () => {
  console.log('📝 Ricevuto SIGINT, fermando scheduler...');
  SchedulerService.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('📝 Ricevuto SIGTERM, fermando scheduler...');
  SchedulerService.stop();
  process.exit(0);
});