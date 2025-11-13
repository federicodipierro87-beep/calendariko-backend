import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Tutte le rotte richiedono autenticazione admin
router.get('/', authenticateToken, requireAdmin, NotificationController.getNotifications);
router.get('/unread-count', authenticateToken, requireAdmin, NotificationController.getUnreadCount);
router.put('/:id/read', authenticateToken, requireAdmin, NotificationController.markAsRead);
router.put('/mark-all-read', authenticateToken, requireAdmin, NotificationController.markAllAsRead);
router.delete('/:id', authenticateToken, requireAdmin, NotificationController.deleteNotification);

export default router;