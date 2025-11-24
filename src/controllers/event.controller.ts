import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class EventController {
  static async getAllEvents(req: AuthenticatedRequest, res: Response) {
    try {
      // Recupera tutti gli eventi dell'utente autenticato
      const events = await prisma.event.findMany({
        where: {
          userId: req.user?.id
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { startTime: 'asc' }
      });
      
      res.status(200).json(events);
    } catch (error) {
      console.error('Errore nel recupero degli eventi:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo null (evento non trovato)
      // In futuro qui implementeremo la logica per recuperare l'evento specifico
      res.status(404).json({
        success: false,
        message: 'Evento non trovato'
      });
    } catch (error) {
      console.error('Errore nel recupero dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, description, startTime, endTime, location, groupId } = req.body;
      
      // Crea un nuovo evento nel database
      const newEvent = await prisma.event.create({
        data: {
          title,
          description,
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          location,
          groupId,
          userId: req.user!.id
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        }
      });
      
      res.status(201).json(newEvent);
    } catch (error) {
      console.error('Errore nella creazione dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const eventData = req.body;
      
      // Per ora restituiamo un errore 404
      // In futuro qui implementeremo la logica per aggiornare l'evento nel database
      res.status(404).json({
        success: false,
        message: 'Evento non trovato'
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo un errore 404
      // In futuro qui implementeremo la logica per eliminare l'evento dal database
      res.status(404).json({
        success: false,
        message: 'Evento non trovato'
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}