import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.post('/register', AuthController.register);
router.get('/verify-email/:token', AuthController.verifyEmail);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/create-first-admin', AuthController.createFirstAdmin);
router.get('/create-first-admin', AuthController.createFirstAdmin); // Temporary GET endpoint for easy testing

export default router;