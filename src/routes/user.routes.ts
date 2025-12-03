import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);

// Rotte per gli utenti
router.get('/without-group', UserController.getUsersWithoutGroup); // Deve essere prima di /:id
router.get('/', UserController.getAllUsers);
router.get('/:id', UserController.getUserById);
router.put('/change-password', UserController.changePassword); // Deve essere prima di /:id
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;