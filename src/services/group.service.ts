import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GroupService {
  static async getAllGroups() {
    return await prisma.group.findMany({
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
    return await prisma.group.delete({
      where: { id }
    });
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

    return await prisma.userGroup.create({
      data: {
        group_id: groupId,
        user_id: userId
      }
    });
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
    return await prisma.userGroup.findMany({
      where: { user_id: userId },
      include: {
        group: true
      }
    });
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
}