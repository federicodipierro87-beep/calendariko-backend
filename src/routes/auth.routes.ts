import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginRateLimiter, strictLoginRateLimiter, emailRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Login con rate limiting a più livelli
router.post('/login', 
  loginRateLimiter,           // Rate limit generale per IP
  strictLoginRateLimiter,     // Rate limit per fallimenti
  emailRateLimiter,           // Rate limit per email specifica
  AuthController.login
);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.post('/register', AuthController.register);
router.get('/verify/:token', AuthController.verifyEmailRedirect); // New HTML redirect endpoint
router.get('/verify-email/:token', AuthController.verifyEmail); // Keep API endpoint
router.post('/resend-verification', AuthController.resendVerification);
router.post('/create-first-admin', AuthController.createFirstAdmin);
router.get('/create-first-admin', AuthController.createFirstAdmin); // Temporary GET endpoint for easy testing

export default router;