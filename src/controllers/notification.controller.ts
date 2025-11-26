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
    } catch (error: any) {
      console.error('Errore nel conteggio delle notifiche non lette:', error);
      // Se la tabella non esiste ancora, restituisci 0
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return res.status(200).json({ count: 0 });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getAllNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId: req.user?.id
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
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


  static async deleteNotification(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      // Verifica che la notifica esista e appartenga all'utente autenticato
      const notification = await prisma.notification.findFirst({
        where: {
          id: id,
          userId: req.user?.id
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notifica non trovata'
        });
      }

      // Elimina la notifica
      await prisma.notification.delete({
        where: {
          id: id
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Notifica eliminata con successo'
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione della notifica:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  // Nuovo endpoint per eliminare notifiche di registrazione per utente specifico
  static async deleteUserRegistrationNotifications(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      
      // Solo admin possono eliminare notifiche per altri utenti
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato'
        });
      }

      // Elimina tutte le notifiche di tipo NEW_USER_REGISTRATION che hanno newUserId uguale al parametro
      const result = await prisma.notification.deleteMany({
        where: {
          type: 'INFO', // Assumendo che le notifiche di registrazione siano di tipo INFO
          data: {
            path: ['newUserId'],
            equals: userId
          }
        }
      });

      res.status(200).json({
        success: true,
        message: `${result.count} notifiche eliminate per l'utente ${userId}`,
        deletedCount: result.count
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione delle notifiche utente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      
      // Verifica che la notifica esista e appartenga all'utente autenticato
      const notification = await prisma.notification.findFirst({
        where: {
          id: id,
          userId: req.user?.id
        }
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notifica non trovata'
        });
      }

      // Marca come letta
      await prisma.notification.update({
        where: {
          id: id
        },
        data: {
          isRead: true
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Notifica marcata come letta'
      });
    } catch (error) {
      console.error('Errore nella marcatura della notifica come letta:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async markAllAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      // Marca tutte le notifiche dell'utente come lette
      await prisma.notification.updateMany({
        where: {
          userId: req.user?.id,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
      
      res.status(200).json({
        success: true,
        message: 'Tutte le notifiche marcate come lette'
      });
    } catch (error) {
      console.error('Errore nella marcatura delle notifiche come lette:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}