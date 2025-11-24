import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Applica autenticazione e verifica ruolo admin
router.use(authenticateToken);
router.use(requireAdmin);

// Endpoint temporaneo per resettare il database
router.post('/reset-database', AdminController.resetDatabase);

export default router;