import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class NotificationController {
  static async getUnreadCount(req: AuthenticatedRequest, res: Response) {
    try {
      // Conta le notifiche non lette dell'utente autenticato
      const unreadCount = await prisma.notification.count({
        where: {
          userId: req.user?.id,
          isRead: false
        }
      });
      
      res.status(200).json({ count: unreadCount });
    } catch (error) {
      console.error('Errore nel conteggio delle notifiche non lette:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getAllNotifications(req: Request, res: Response) {
    try {
      // Per ora restituiamo un array vuoto
      const notifications: any[] = [];
      
      res.status(200).json(notifications);
    } catch (error) {
      console.error('Errore nel recupero delle notifiche:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getNotificationById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      res.status(404).json({
        success: false,
        message: 'Notifica non trovata'
      });
    } catch (error) {
      console.error('Errore nel recupero della notifica:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async createNotification(req: Request, res: Response) {
    try {
      const notificationData = req.body;
      
      const newNotification = {
        id: Date.now().toString(),
        ...notificationData,
        read: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      res.status(201).json(newNotification);
    } catch (error) {
      console.error('Errore nella creazione della notifica:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async markAsRead(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      res.status(404).json({
        success: false,
        message: 'Notifica non trovata'
      });
    } catch (error) {
      console.error('Errore nella marcatura della notifica come letta:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      res.status(404).json({
        success: false,
        message: 'Notifica non trovata'
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione della notifica:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}