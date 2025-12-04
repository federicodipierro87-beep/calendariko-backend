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

  static async getCurrentUserGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Utente non autenticato'
        });
      }

      // Recupera l'utente con le sue membership ai gruppi
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          groupMemberships: {
            include: {
              group: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  genre: true,
                  description: true,
                  createdAt: true,
                  updatedAt: true,
                  // Include members per compatibilità con frontend
                  members: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstName: true,
                          lastName: true,
                          email: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }

      // Estrai i gruppi dalle membership e mappa la struttura per compatibilità frontend
      const groups = user.groupMemberships.map((membership: any) => {
        const group = membership.group;
        // Mappa 'members' a 'user_groups' per compatibilità con il frontend
        return {
          ...group,
          user_groups: group.members.map((member: any) => ({
            user_id: member.user.id,
            user: member.user
          }))
        };
      });

      console.log(`🔍 User ${user.email} requested their groups: ${groups.length} found`);
      
      res.status(200).json(groups);
    } catch (error) {
      console.error('Errore nel recupero dei gruppi dell\'utente:', error);
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

  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Utente non autenticato'
        });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password attuale e nuova password sono richieste'
        });
      }

      // Trova l'utente
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }

      // Verifica la password attuale
      const bcrypt = require('bcryptjs');
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Password attuale non corretta'
        });
      }

      // Hash della nuova password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      // Aggiorna la password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashedNewPassword
        }
      });

      console.log('🔐 Password cambiata con successo per utente:', user.email);

      res.status(200).json({
        success: true,
        message: 'Password aggiornata con successo'
      });
    } catch (error: any) {
      console.error('Errore nel cambio password:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}