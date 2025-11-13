import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async getNotifications(req: Request, res: Response) {
    try {
      const notifications = await NotificationService.getAdminNotifications();
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Errore nel recupero delle notifiche' });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await NotificationService.markNotificationAsRead(id);
      res.json({ message: 'Notifica segnata come letta' });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Errore nell\'aggiornamento della notifica' });
    }
  }

  static async markAllAsRead(req: Request, res: Response) {
    try {
      await NotificationService.markAllNotificationsAsRead();
      res.json({ message: 'Tutte le notifiche segnate come lette' });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Errore nell\'aggiornamento delle notifiche' });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await NotificationService.deleteNotification(id);
      res.json({ message: 'Notifica eliminata' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Errore nell\'eliminazione della notifica' });
    }
  }

  static async getUnreadCount(req: Request, res: Response) {
    try {
      const count = await NotificationService.getUnreadNotificationsCount();
      res.json({ count });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Errore nel conteggio delle notifiche' });
    }
  }
}