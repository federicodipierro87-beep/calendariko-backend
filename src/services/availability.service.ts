import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AvailabilityService {
  static async getAvailability(params: {
    userId?: string;
    groupId?: string;
    start?: string;
    end?: string;
  }) {
    const { userId, groupId, start, end } = params;
    
    const where: any = {};
    
    if (userId) where.user_id = userId;
    if (groupId) where.group_id = groupId;
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    return await prisma.availability.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
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
  }

  static async createAvailability(data: {
    user_id: string;
    group_id: string;
    date: string;
    type: 'AVAILABLE' | 'UNAVAILABLE';
    notes?: string;
  }) {
    const existingAvailability = await prisma.availability.findFirst({
      where: {
        user_id: data.user_id,
        group_id: data.group_id,
        date: new Date(data.date)
      }
    });

    if (existingAvailability) {
      return await prisma.availability.update({
        where: {
          id: existingAvailability.id
        },
        data: {
          type: data.type,
          notes: data.notes,
          updated_at: new Date()
        }
      });
    }

    return await prisma.availability.create({
      data: {
        ...data,
        date: new Date(data.date)
      }
    });
  }

  static async updateAvailability(id: string, data: {
    type?: 'AVAILABLE' | 'UNAVAILABLE';
    notes?: string;
  }) {
    return await prisma.availability.update({
      where: { id },
      data
    });
  }

  static async deleteAvailability(id: string) {
    return await prisma.availability.delete({
      where: { id }
    });
  }

  static async createBulkAvailability(data: {
    user_id: string;
    group_id: string;
    dates: string[];
    type: 'AVAILABLE' | 'UNAVAILABLE';
    notes?: string;
  }) {
    const { user_id, group_id, dates, type, notes } = data;
    
    const operations = dates.map(async (date) => {
      const existingAvailability = await prisma.availability.findFirst({
        where: {
          user_id,
          group_id,
          date: new Date(date)
        }
      });

      if (existingAvailability) {
        return prisma.availability.update({
          where: { id: existingAvailability.id },
          data: { type, notes, updated_at: new Date() }
        });
      } else {
        return prisma.availability.create({
          data: {
            user_id,
            group_id,
            date: new Date(date),
            type,
            notes
          }
        });
      }
    });

    return await Promise.all(operations);
  }

  static async getUserAvailabilityForGroup(userId: string, groupId: string, month?: string) {
    const where: any = {
      user_id: userId,
      group_id: groupId
    };

    if (month) {
      const startOfMonth = new Date(month);
      const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);
      
      where.date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    return await prisma.availability.findMany({
      where,
      orderBy: {
        date: 'asc'
      }
    });
  }

  static async getGroupAvailabilityOverview(groupId: string, date: string) {
    const targetDate = new Date(date);
    
    const groupMembers = await prisma.userGroup.findMany({
      where: { group_id: groupId },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    const availability = await prisma.availability.findMany({
      where: {
        group_id: groupId,
        date: targetDate
      },
      include: {
        user: {
          select: {
            id: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    return {
      date: targetDate,
      total_members: groupMembers.length,
      availability_responses: availability.length,
      available_members: availability.filter(a => a.type === 'AVAILABLE'),
      unavailable_members: availability.filter(a => a.type === 'UNAVAILABLE'),
      no_response_members: groupMembers.filter(
        member => !availability.some(a => a.user_id === member.user.id)
      )
    };
  }
}