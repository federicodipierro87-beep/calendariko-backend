import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.post('/register', authenticateToken, requireAdmin, AuthController.register);
router.post('/public-register', AuthController.publicRegister);
router.post('/create-first-admin', AuthController.createFirstAdmin);
router.get('/public-groups', AuthController.getPublicGroups);

export default router;