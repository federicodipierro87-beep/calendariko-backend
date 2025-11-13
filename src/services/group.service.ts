import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GroupService {
  static async getAllGroups() {
    const groups = await prisma.group.findMany({
      include: {
        user_groups: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                role: true
              }
            }
          }
        },
        _count: {
          select: {
            events: true,
            user_groups: true
          }
        }
      }
    });
    console.log('🔍 getAllGroups result count:', groups.length);
    console.log('🔍 getAllGroups IDs:', groups.map(g => g.id));
    return groups;
  }

  static async getGroupById(id: string) {
    return await prisma.group.findUnique({
      where: { id },
      include: {
        user_groups: {
          include: {
            user: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
                role: true,
                avatar_url: true
              }
            }
          }
        },
        events: {
          orderBy: {
            date: 'desc'
          },
          take: 10
        }
      }
    });
  }

  static async createGroup(data: {
    name: string;
    type: 'BAND' | 'DJ' | 'SOLO';
    description?: string;
    genre?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    return await prisma.group.create({
      data
    });
  }

  static async updateGroup(id: string, data: {
    name?: string;
    type?: 'BAND' | 'DJ' | 'SOLO';
    description?: string;
    genre?: string;
    logo_url?: string;
    contact_email?: string;
    contact_phone?: string;
  }) {
    return await prisma.group.update({
      where: { id },
      data
    });
  }

  static async deleteGroup(id: string) {
    console.log(`🗑️ Eliminazione gruppo ${id} - Inizio processo cascata`);
    
    try {
      // 1. Elimina tutti gli eventi del gruppo
      const eventsDeleted = await prisma.event.deleteMany({
        where: { group_id: id }
      });
      console.log(`🗑️ Eliminati ${eventsDeleted.count} eventi`);

      // 2. Elimina tutte le disponibilità del gruppo
      const availabilitiesDeleted = await prisma.availability.deleteMany({
        where: { group_id: id }
      });
      console.log(`🗑️ Eliminate ${availabilitiesDeleted.count} disponibilità`);

      // 3. Elimina tutte le relazioni user_groups
      const userGroupsDeleted = await prisma.userGroup.deleteMany({
        where: { group_id: id }
      });
      console.log(`🗑️ Eliminate ${userGroupsDeleted.count} relazioni membri`);

      // 4. Infine elimina il gruppo
      const deletedGroup = await prisma.group.delete({
        where: { id }
      });
      console.log(`✅ Gruppo ${deletedGroup.name} eliminato con successo`);
      
      return deletedGroup;
    } catch (error) {
      console.error(`❌ Errore nell'eliminazione del gruppo ${id}:`, error);
      throw new Error(`Failed to delete group: ${(error as Error).message}`);
    }
  }

  static async addMemberToGroup(groupId: string, userId: string) {
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        group_id: groupId,
        user_id: userId
      }
    });

    if (existingMembership) {
      throw new Error('User is already a member of this group');
    }

    // Prima di creare la membership, controlliamo se c'è una notifica per questo utente
    const newUserNotification = await prisma.notification.findFirst({
      where: {
        type: 'NEW_USER_REGISTRATION',
        is_read: false,
        data: {
          path: ['newUserId'],
          equals: userId
        }
      }
    });

    // Crea la membership
    const membership = await prisma.userGroup.create({
      data: {
        group_id: groupId,
        user_id: userId
      }
    });

    // Se esiste una notifica non letta per questo utente, marcala come letta
    if (newUserNotification) {
      await prisma.notification.update({
        where: { id: newUserNotification.id },
        data: { is_read: true }
      });
      console.log(`✅ Marcata come letta notifica ${newUserNotification.id} per utente ${userId}`);
    }

    return membership;
  }

  static async removeMemberFromGroup(groupId: string, userId: string) {
    const membership = await prisma.userGroup.findFirst({
      where: {
        group_id: groupId,
        user_id: userId
      }
    });

    if (!membership) {
      throw new Error('User is not a member of this group');
    }

    return await prisma.userGroup.delete({
      where: {
        id: membership.id
      }
    });
  }

  static async getUserGroups(userId: string) {
    const userGroups = await prisma.userGroup.findMany({
      where: { user_id: userId },
      include: {
        group: true
      }
    });
    
    // Return only the unique groups, not the relationship data
    return userGroups.map(ug => ug.group);
  }

  static async getGroupMembers(groupId: string) {
    return await prisma.userGroup.findMany({
      where: { group_id: groupId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            role: true
          }
        }
      }
    });
  }

  static async getUserById(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        role: true
      }
    });
  }

  static async getPublicGroups() {
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        genre: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });
    console.log('🔍 getPublicGroups result count:', groups.length);
    console.log('🔍 getPublicGroups IDs:', groups.map(g => g.id));
    return groups;
  }
}