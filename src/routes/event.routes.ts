import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);

// Rotte per gli eventi
router.get('/', EventController.getAllEvents);
router.get('/:id', EventController.getEventById);
router.post('/', EventController.createEvent);
router.put('/:id', EventController.updateEvent);
router.delete('/:id', EventController.deleteEvent);

export default router;