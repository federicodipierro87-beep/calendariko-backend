import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);

// Rotte per la disponibilità
router.get('/', AvailabilityController.getAllAvailability);
router.get('/:id', AvailabilityController.getAvailabilityById);
router.post('/', AvailabilityController.createAvailability);
router.put('/:id', AvailabilityController.updateAvailability);
router.delete('/:id', AvailabilityController.deleteAvailability);

export default router;