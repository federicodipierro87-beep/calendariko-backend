import { Router } from 'express';
import { BackupController } from '../controllers/backup.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Tutte le routes richiedono autenticazione
router.use(authenticateToken);

// GET /api/backup/list - Lista tutti i backup
router.get('/list', BackupController.getBackups);

// GET /api/backup/stats - Statistiche sui backup
router.get('/stats', BackupController.getBackupStats);

// GET /api/backup/config - Configurazione scheduling
router.get('/config', BackupController.getScheduleConfig);

// POST /api/backup/create - Crea un backup manuale
router.post('/create', BackupController.createBackup);

// POST /api/backup/test - Test del sistema di backup
router.post('/test', BackupController.testBackup);

// POST /api/backup/cleanup - Cleanup manuale backup vecchi
router.post('/cleanup', BackupController.cleanupBackups);

// GET /api/backup/:backupId/verify - Verifica integrità backup
router.get('/:backupId/verify', BackupController.verifyBackup);

// DELETE /api/backup/:backupId - Elimina un backup specifico
router.delete('/:backupId', BackupController.deleteBackup);

// POST /api/backup/:backupId/restore - Ripristina da backup (PERICOLOSO)
router.post('/:backupId/restore', BackupController.restoreBackup);

export default router;