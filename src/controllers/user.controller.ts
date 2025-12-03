import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
  static async getUsersWithoutGroup(req: Request, res: Response) {
    try {
      const { excludeGroupId } = req.query;
      
      let whereClause: any = {
        role: {
          not: 'ADMIN' // Esclude gli utenti admin
        }
      };

      // Se viene specificato un gruppo da escludere, filtra gli utenti che NON sono in quel gruppo
      if (excludeGroupId && typeof excludeGroupId === 'string') {
        whereClause.groupMemberships = {
          none: {
            groupId: excludeGroupId
          }
        };
      } else {
        // Se non viene specificato un gruppo, mostra utenti che non sono in NESSUN gruppo
        whereClause.groupMemberships = {
          none: {}
        };
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          groupMemberships: {
            select: {
              groupId: true,
              group: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });
      
      res.status(200).json(users);
    } catch (error) {
      console.error('Errore nel recupero degli utenti senza gruppo:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      // Recupera tutti gli utenti dal database
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
          // Non includiamo passwordHash per sicurezza
        }
      });
      
      // Il frontend si aspetta direttamente un array
      res.status(200).json(users);
    } catch (error) {
      console.error('Errore nel recupero degli utenti:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Errore nel recupero dell\'utente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role, password } = req.body;
      
      // Prepara i dati per l'update
      const updateData: any = {
        firstName,
        lastName,
        email,
        role
      };
      
      // Se è stata fornita una nuova password, hashala e includila nell'update
      if (password) {
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        updateData.passwordHash = hashedPassword;
        console.log('🔐 Password dell\'utente aggiornata');
      }
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento dell\'utente:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.user.delete({
        where: { id }
      });
      
      res.status(200).json({
        success: true,
        message: 'Utente eliminato con successo'
      });
    } catch (error: any) {
      console.error('Errore nell\'eliminazione dell\'utente:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}