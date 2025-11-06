import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, AvailabilityController.getAvailability);
router.post('/', authenticateToken, AvailabilityController.createAvailability);
router.post('/bulk', authenticateToken, AvailabilityController.createBulkAvailability);
router.put('/:id', authenticateToken, AvailabilityController.updateAvailability);
router.delete('/:id', authenticateToken, AvailabilityController.deleteAvailability);
router.get('/group/:groupId/overview', authenticateToken, AvailabilityController.getGroupAvailabilityOverview);

export default router;