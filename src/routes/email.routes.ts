import { Router } from 'express';
import { 
  testEmail, 
  emailStatus,
  testWelcomeEmail,
  testGroupModificationEmail,
  testEventModificationEmail,
  testEventDeletionEmail,
  testGroupInvitationEmail,
  testEventConfirmationEmail,
  testPasswordResetEmail,
  testUnavailabilityModificationEmail,
  getEmailTemplates
} from '../controllers/email.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Route per testare l'invio email
router.post('/test', authenticateToken, testEmail);

// Route per verificare lo status della configurazione email
router.get('/status', authenticateToken, emailStatus);

// Route per ottenere lista template disponibili (pubblica per documentazione)
router.get('/templates', getEmailTemplates);

// Routes per testare template specifici
router.post('/test/welcome', authenticateToken, testWelcomeEmail);
router.post('/test/group-modification', authenticateToken, testGroupModificationEmail);
router.post('/test/event-modification', authenticateToken, testEventModificationEmail);
router.post('/test/event-deletion', authenticateToken, testEventDeletionEmail);
router.post('/test/group-invitation', authenticateToken, testGroupInvitationEmail);
router.post('/test/event-confirmation', authenticateToken, testEventConfirmationEmail);
router.post('/test/password-reset', authenticateToken, testPasswordResetEmail);
router.post('/test/unavailability-modification', authenticateToken, testUnavailabilityModificationEmail);

export default router;