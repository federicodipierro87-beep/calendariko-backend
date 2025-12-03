import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Tutte le routes richiedono autenticazione
router.use(authenticateToken);

// Get audit logs con filtri
router.get('/logs', AuditController.getAuditLogs);

// Get attività di un admin specifico
router.get('/activity/:adminId?', AuditController.getAdminActivity);

// Get statistiche audit
router.get('/stats', AuditController.getAuditStats);

export default router;