import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Applica il middleware di autenticazione a tutte le rotte
router.use(authenticateToken);

// Rotte per le notifiche
router.get('/unread-count', NotificationController.getUnreadCount);
router.get('/', NotificationController.getAllNotifications);
router.get('/:id', NotificationController.getNotificationById);
router.post('/', NotificationController.createNotification);
router.put('/mark-all-read', NotificationController.markAllAsRead);
router.put('/:id/read', NotificationController.markAsRead);
router.delete('/user/:userId/registration', NotificationController.deleteUserRegistrationNotifications);
router.delete('/:id', NotificationController.deleteNotification);

export default router;