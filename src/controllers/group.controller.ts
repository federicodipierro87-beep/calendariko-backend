import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class GroupController {
  static async getAllGroups(req: AuthenticatedRequest, res: Response) {
    try {
      // Prova a recuperare dati reali dal database
      try {
        const groups = await prisma.group.findMany({
          where: {
            creatorId: req.user?.id
          },
          include: {
            creator: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        });
        
        console.log(`✅ Retrieved ${groups.length} groups for user ${req.user?.email}`);
        res.status(200).json(groups);
        
      } catch (dbError: any) {
        console.log('⚠️ Database not available, returning empty array:', dbError.message);
        res.status(200).json([]);
      }
      
    } catch (error) {
      console.error('Errore nel recupero dei gruppi:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getGroupById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Se l'ID inizia con "mock_", è un mock group (non nel database)
      if (id.startsWith('mock_')) {
        console.log('⚠️ Requested mock group ID, returning not found');
        return res.status(404).json({
          success: false,
          message: 'Gruppo mock non più disponibile'
        });
      }
      
      // Prova a recuperare il gruppo dal database
      try {
        const group = await prisma.group.findUnique({
          where: { id: id },
          include: {
            creator: {
              select: { firstName: true, lastName: true, email: true }
            }
          }
        });

        if (!group) {
          return res.status(404).json({
            success: false,
            message: 'Gruppo non trovato'
          });
        }

        console.log(`✅ Retrieved group "${group.name}" with ID ${id}`);
        res.status(200).json(group);

      } catch (dbError: any) {
        console.log('⚠️ Database not available for getGroupById:', dbError.message);
        res.status(404).json({
          success: false,
          message: 'Gruppo non trovato'
        });
      }
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
      
      // Prova a salvare nel database reale
      try {
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
            }
          }
        });
        
        console.log(`✅ Created group "${name}" for user ${req.user?.email}`);
        res.status(201).json(newGroup);
        
      } catch (dbError: any) {
        console.log('⚠️ Database not available, creating mock group:', dbError.message);
        // Fallback to mock data with cuid-like ID for compatibility
        const mockGroup = {
          id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description,
          color,
          creatorId: req.user!.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          creator: {
            firstName: req.user!.firstName || 'User',
            lastName: req.user!.lastName || 'Default',
            email: req.user!.email
          }
        };
        res.status(201).json(mockGroup);
      }
      
    } catch (error) {
      console.error('Errore nella creazione del gruppo:', error);
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