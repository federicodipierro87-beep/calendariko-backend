import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvailabilityController {
  static async getAllAvailability(req: Request, res: Response) {
    try {
      const { userId, groupId, start, end } = req.query;
      const currentUser = (req as any).user;
      
      console.log('🔍 Availability query params:', { userId, groupId, start, end });
      console.log('🔍 Current user:', currentUser?.email);
      
      // Costruisci il filtro WHERE
      const whereClause: any = {};
      
      // Per utenti non admin, mostra solo le proprie availability
      if (currentUser?.role !== 'ADMIN') {
        whereClause.userId = currentUser?.id;
      } else if (userId) {
        // Admin può filtrare per userId specifico
        whereClause.userId = userId as string;
      }
      
      if (groupId) {
        whereClause.groupId = groupId as string;
      }
      
      if (start || end) {
        whereClause.date = {};
        if (start) whereClause.date.gte = new Date(start as string);
        if (end) whereClause.date.lte = new Date(end as string);
      }
      
      const availability = await prisma.dayAvailability.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
      
      console.log('📊 Found availability records:', availability.length);
      
      // Il frontend si aspetta direttamente un array
      res.status(200).json(availability);
    } catch (error) {
      console.error('Errore nel recupero della disponibilità:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getAvailabilityById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo null (disponibilità non trovata)
      res.status(404).json({
        success: false,
        message: 'Disponibilità non trovata'
      });
    } catch (error) {
      console.error('Errore nel recupero della disponibilità:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async createAvailability(req: Request, res: Response) {
    try {
      const { date, type, notes, group_id, user_id } = req.body;
      const currentUser = (req as any).user;
      
      console.log('🔄 Creating availability:', { date, type, notes, group_id, user_id });
      console.log('🔍 Current user:', currentUser?.email);
      
      // Validazione
      if (!date || !type || !group_id) {
        return res.status(400).json({
          success: false,
          message: 'Data, tipo e gruppo sono richiesti'
        });
      }
      
      // Determina userId finale
      let finalUserId = user_id;
      if (!finalUserId && currentUser?.role !== 'ADMIN') {
        finalUserId = currentUser?.id;
      }
      
      // Crea la disponibilità nel database
      const newAvailability = await prisma.dayAvailability.create({
        data: {
          date: new Date(date),
          type: type,
          notes: notes || null,
          groupId: group_id,
          userId: finalUserId || null
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      });
      
      console.log('✅ Availability created in database:', newAvailability.id);
      
      res.status(201).json(newAvailability);
    } catch (error) {
      console.error('Errore nella creazione della disponibilità:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async updateAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes, type } = req.body;
      const currentUser = (req as any).user;
      
      // Verifica se la disponibilità esiste
      const availability = await prisma.dayAvailability.findUnique({
        where: { id },
        include: { user: true, group: true }
      });
      
      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Disponibilità non trovata'
        });
      }
      
      // Verifica autorizzazioni: solo il proprietario o un admin può modificare
      if (currentUser?.role !== 'ADMIN' && availability.userId !== currentUser?.id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato a modificare questa disponibilità'
        });
      }
      
      // Aggiorna la disponibilità
      const updatedAvailability = await prisma.dayAvailability.update({
        where: { id },
        data: {
          ...(notes !== undefined && { notes }),
          ...(type !== undefined && { type })
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          group: {
            select: {
              id: true,
              name: true,
              type: true
            }
          }
        }
      });
      
      res.status(200).json(updatedAvailability);
    } catch (error) {
      console.error('Errore nell\'aggiornamento della disponibilità:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteAvailability(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const currentUser = (req as any).user;
      
      // Verifica se la disponibilità esiste
      const availability = await prisma.dayAvailability.findUnique({
        where: { id },
        include: { user: true }
      });
      
      if (!availability) {
        return res.status(404).json({
          success: false,
          message: 'Disponibilità non trovata'
        });
      }
      
      // Verifica autorizzazioni: solo il proprietario o un admin può eliminare
      if (currentUser?.role !== 'ADMIN' && availability.userId !== currentUser?.id) {
        return res.status(403).json({
          success: false,
          message: 'Non autorizzato a eliminare questa disponibilità'
        });
      }
      
      // Elimina la disponibilità
      await prisma.dayAvailability.delete({
        where: { id }
      });
      
      res.status(200).json({
        success: true,
        message: 'Disponibilità eliminata con successo'
      });
    } catch (error) {
      console.error('Errore nell\'eliminazione della disponibilità:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}