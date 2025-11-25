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
            },
            members: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, email: true, role: true }
                }
              }
            }
          }
        });

        if (!group) {
          return res.status(404).json({
            success: false,
            message: 'Gruppo non trovato'
          });
        }

        // Trasforma i dati per compatibilità frontend
        const groupWithUserGroups = {
          ...group,
          user_groups: group.members.map(member => ({
            user_id: member.user.id,
            group_id: group.id,
            user: {
              id: member.user.id,
              first_name: member.user.firstName,
              last_name: member.user.lastName,
              email: member.user.email,
              role: member.user.role
            }
          }))
        };

        console.log(`✅ Retrieved group "${group.name}" with ${group.members.length} members`);
        res.status(200).json(groupWithUserGroups);

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
      const { name, description, type, color } = req.body;
      
      // Prova a salvare nel database reale
      try {
        const newGroup = await prisma.group.create({
          data: {
            name,
            description,
            type,
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
      const { name, description, type, color, genre, contact_email, contact_phone } = req.body;
      
      console.log(`✏️ [Railway DB] Tentativo di aggiornamento gruppo ID: ${id}`);
      console.log(`📝 Dati ricevuti:`, { name, description, type, color, genre, contact_email, contact_phone });
      
      // Verifica se il gruppo esiste
      const existingGroup = await prisma.group.findUnique({
        where: { id }
      });
      
      if (!existingGroup) {
        console.log(`❌ Gruppo ${id} non trovato nel database`);
        return res.status(404).json({
          success: false,
          message: 'Gruppo non trovato'
        });
      }
      
      // Aggiorna il gruppo nel database
      const updatedGroup = await prisma.group.update({
        where: { id },
        data: {
          name: name || existingGroup.name,
          description: description || existingGroup.description,
          type: type || existingGroup.type,
          color: color || existingGroup.color
          // Note: genre, contact_email, contact_phone non sono nel schema attuale
          // Se necessari, vanno aggiunti al modello Group
        },
        include: {
          creator: {
            select: { firstName: true, lastName: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true }
              }
            }
          }
        }
      });
      
      // Trasforma i dati per compatibilità frontend
      const groupWithUserGroups = {
        ...updatedGroup,
        user_groups: updatedGroup.members.map(member => ({
          user_id: member.user.id,
          group_id: updatedGroup.id,
          user: {
            id: member.user.id,
            first_name: member.user.firstName,
            last_name: member.user.lastName,
            email: member.user.email,
            role: member.user.role
          }
        }))
      };
      
      console.log(`✅ [Railway DB] Gruppo "${updatedGroup.name}" aggiornato con successo`);
      res.status(200).json(groupWithUserGroups);
      
    } catch (error: any) {
      console.error('❌ Errore nell\'aggiornamento del gruppo:', error);
      res.status(500).json({
        success: false,
        message: `Errore interno del server: ${error.message}`
      });
    }
  }

  static async deleteGroup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ [Railway DB] Tentativo di eliminazione gruppo ID: ${id}`);
      
      // Non permettere eliminazione di gruppi mock
      if (id.startsWith('mock_')) {
        console.log(`❌ Tentativo di eliminare gruppo mock ${id}`);
        return res.status(400).json({
          success: false,
          message: 'I gruppi mock non possono essere eliminati'
        });
      }
      
      // Verifica se il gruppo esiste
      const existingGroup = await prisma.group.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              events: true,
              members: true
            }
          }
        }
      });
      
      if (!existingGroup) {
        console.log(`❌ Gruppo ${id} non trovato nel database`);
        return res.status(404).json({
          success: false,
          message: 'Gruppo non trovato'
        });
      }
      
      console.log(`📊 Gruppo "${existingGroup.name}" ha ${existingGroup._count.events} eventi e ${existingGroup._count.members} membri`);
      
      // Elimina il gruppo (le relazioni verranno gestite dalle constraint del database)
      await prisma.group.delete({
        where: { id }
      });
      
      console.log(`✅ [Railway DB] Gruppo "${existingGroup.name}" (ID: ${id}) eliminato con successo`);
      res.status(200).json({
        success: true,
        message: `Gruppo "${existingGroup.name}" eliminato con successo`
      });
      
    } catch (error: any) {
      console.error('❌ Errore nell\'eliminazione del gruppo:', error);
      
      // Gestisci errori specifici del database
      if (error.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'Impossibile eliminare il gruppo: contiene ancora eventi o membri'
        });
      }
      
      res.status(500).json({
        success: false,
        message: `Errore interno del server: ${error.message}`
      });
    }
  }

  // Group members methods
  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const { userId, email } = req.body;

      console.log(`👥 Adding member to group ${groupId}:`, { userId, email });

      // Se l'ID del gruppo inizia con "mock_", è un mock group
      if (groupId.startsWith('mock_')) {
        return res.status(404).json({
          success: false,
          message: 'Gruppo mock non supporta membri'
        });
      }

      try {
        // Find user by email or ID
        let targetUser;
        if (email) {
          targetUser = await prisma.user.findUnique({
            where: { email }
          });
        } else if (userId) {
          targetUser = await prisma.user.findUnique({
            where: { id: userId }
          });
        }

        if (!targetUser) {
          return res.status(404).json({
            success: false,
            message: 'Utente non trovato'
          });
        }

        // Check if group exists
        const group = await prisma.group.findUnique({
          where: { id: groupId }
        });

        if (!group) {
          return res.status(404).json({
            success: false,
            message: 'Gruppo non trovato'
          });
        }

        // Check if user is already a member
        const existingMembership = await prisma.userGroup.findUnique({
          where: {
            userId_groupId: {
              userId: targetUser.id,
              groupId: groupId
            }
          }
        });

        if (existingMembership) {
          return res.status(400).json({
            success: false,
            message: 'Utente già membro del gruppo'
          });
        }

        // Add user to group
        const membership = await prisma.userGroup.create({
          data: {
            userId: targetUser.id,
            groupId: groupId
          },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true }
            }
          }
        });

        console.log(`✅ Added user ${targetUser.email} to group ${groupId}`);
        res.status(201).json({
          success: true,
          member: membership.user
        });

      } catch (dbError: any) {
        console.log('⚠️ Database error adding member:', dbError.message);
        res.status(500).json({
          success: false,
          message: 'Errore nel database'
        });
      }

    } catch (error) {
      console.error('Errore nell\'aggiunta del membro:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId, userId } = req.params;

      try {
        const membership = await prisma.userGroup.findUnique({
          where: {
            userId_groupId: {
              userId: userId,
              groupId: groupId
            }
          }
        });

        if (!membership) {
          return res.status(404).json({
            success: false,
            message: 'Utente non è membro del gruppo'
          });
        }

        await prisma.userGroup.delete({
          where: {
            userId_groupId: {
              userId: userId,
              groupId: groupId
            }
          }
        });

        console.log(`✅ Removed user ${userId} from group ${groupId}`);
        res.json({
          success: true,
          message: 'Utente rimosso dal gruppo'
        });

      } catch (dbError: any) {
        console.log('⚠️ Database error removing member:', dbError.message);
        res.status(500).json({
          success: false,
          message: 'Errore nel database'
        });
      }

    } catch (error) {
      console.error('Errore nella rimozione del membro:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getGroupMembers(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId } = req.params;

      try {
        const members = await prisma.userGroup.findMany({
          where: { groupId },
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true, role: true }
            }
          }
        });

        const membersList = members.map(m => m.user);
        console.log(`✅ Retrieved ${membersList.length} members for group ${groupId}`);
        res.json(membersList);

      } catch (dbError: any) {
        console.log('⚠️ Database error getting members:', dbError.message);
        res.json([]);
      }

    } catch (error) {
      console.error('Errore nel recupero dei membri:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}