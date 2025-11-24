import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';

const router = Router();

// TEMPORANEO: Endpoint di reset senza autenticazione (per emergenza)
// Rimuovere dopo aver risolto il problema!
router.post('/reset-database', AdminController.resetDatabase);

export default router;