import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticateToken } from '../middleware/auth';
import { auditMiddleware } from '../middleware/auditMiddleware';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);
router.use(auditMiddleware); // Log audit per azioni admin

// Rotte per gli eventi
router.get('/', EventController.getAllEvents);
router.get('/:id', EventController.getEventById);
router.post('/', EventController.createEvent);
router.put('/:id', EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);

export default router;