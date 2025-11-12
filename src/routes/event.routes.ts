import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, EventController.getAllEvents);
router.get('/upcoming', authenticateToken, EventController.getUpcomingEvents);
router.get('/statistics', authenticateToken, EventController.getEventStatistics);
router.get('/debug/ping', (req, res) => res.json({ message: 'Debug endpoint works!', timestamp: new Date() }));
router.post('/debug/test-email/:eventId', authenticateToken, requireAdmin, EventController.testEmailModification);
router.get('/:id', authenticateToken, EventController.getEventById);
router.post('/', authenticateToken, requireAdmin, EventController.createEvent);
router.put('/:id', authenticateToken, requireAdmin, EventController.updateEvent);
router.delete('/:id', authenticateToken, requireAdmin, EventController.deleteEvent);

export default router;