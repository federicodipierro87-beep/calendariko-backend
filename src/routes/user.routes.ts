import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);
router.use(auditMiddleware); // Log audit per azioni admin

// Rotte per gli utenti
router.get('/without-group', UserController.getUsersWithoutGroup); // Deve essere prima di /:id
router.get('/me/groups', UserController.getCurrentUserGroups); // Nuovo endpoint per ottenere i gruppi dell'utente corrente
router.get('/export', UserController.getUsersForExport); // Nuovo endpoint per export completo
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/change-password', UserController.changePassword); // Deve essere prima di /:id
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;