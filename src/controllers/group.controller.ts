import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class GroupController {
  static async getAllGroups(req: AuthenticatedRequest, res: Response) {
    try {
      // Recupera tutti i gruppi dove l'utente è membro o creatore
      const groups = await prisma.group.findMany({
        where: {
          OR: [
            { creatorId: req.user?.id },
            { 
              members: {
                some: { userId: req.user?.id }
              }
            }
          ]
        },
        include: {
          creator: {
            select: { firstName: true, lastName: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          },
          _count: {
            select: { events: true, members: true }
          }
        }
      });
      
      res.status(200).json(groups);
    } catch (error: any) {
      console.error('Errore nel recupero dei gruppi:', error);
      // Se la tabella non esiste ancora, restituisci array vuoto
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return res.status(200).json([]);
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getGroupById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo null (gruppo non trovato)
      // In futuro qui implementeremo la logica per recuperare il gruppo specifico
      res.status(404).json({
        success: false,
        message: 'Gruppo non trovato'
      });
    } catch (error) {
      console.error('Errore nel recupero del gruppo:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, color } = req.body;
      
      // Crea un nuovo gruppo nel database
      const newGroup = await prisma.group.create({
        data: {
          name,
          description,
          color,
          creatorId: req.user!.id
        },
        include: {
          creator: {
            select: { firstName: true, lastName: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true }
              }
            }
          }
        }
      });
      
      res.status(201).json(newGroup);
    } catch (error: any) {
      console.error('Errore nella creazione del gruppo:', error);
      // Se la tabella non esiste ancora, restituisci errore specifico
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return res.status(400).json({
          success: false,
          message: 'Database tables not yet created. Please run migration first.'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async updateGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const groupData = req.body;
      
      // Per ora restituiamo un errore 404
      // In futuro qui implementeremo la logica per aggiornare il gruppo nel database
      res.status(404).json({
        success: false,
        message: 'Gruppo non trovato'
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento del gruppo:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo un errore 404
      // In futuro qui implementeremo la logica per eliminare il gruppo dal database
      res.status(404).json({
        success: false,
        message: 'Gruppo non trovato'
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione del gruppo:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}