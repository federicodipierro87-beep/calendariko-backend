import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EventService {
  static async getAllEvents(params?: {
    start?: string;
    end?: string;
    groupId?: string;
    status?: string;
  }) {
    const { start, end, groupId, status } = params || {};
    
    const where: any = {};
    
    if (groupId) where.group_id = groupId;
    if (status) where.status = status;
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    return await prisma.event.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  static async getEventById(id: string) {
    return await prisma.event.findUnique({
      where: { id },
      include: {
        group: {
          include: {
            user_groups: {
              include: {
                user: {
                  select: {
                    id: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                    phone: true
                  }
                }
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });
  }

  static async createEvent(data: {
    title: string;
    event_type?: string;
    date: string;
    start_time: string;
    end_time: string;
    venue_name: string;
    venue_address?: string;
    venue_city: string;
    group_id?: string;
    fee?: number;
    status?: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
    notes?: string;
    created_by: string;
  }) {
    console.log('Creating event with data:', data);
    
    const startDateTime = new Date(`${data.date}T${data.start_time}`);
    const endDateTime = new Date(`${data.date}T${data.end_time}`);

    console.log('Parsed dates:', { startDateTime, endDateTime });

    if (endDateTime <= startDateTime) {
      throw new Error('End time must be after start time');
    }

    const eventData = {
      ...data,
      date: new Date(data.date),
      start_time: startDateTime,
      end_time: endDateTime,
      fee: data.fee ? Number(data.fee) : undefined,
      status: data.status || 'PROPOSED'
    };

    console.log('Final event data for Prisma:', eventData);

    return await prisma.event.create({
      data: eventData,
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });
  }

  static async updateEvent(id: string, data: {
    title?: string;
    event_type?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    venue_name?: string;
    venue_address?: string;
    venue_city?: string;
    group_id?: string;
    fee?: number;
    status?: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
    notes?: string;
  }) {
    const updateData: any = { ...data };

    if (data.date) {
      updateData.date = new Date(data.date);
    }

    if (data.start_time && data.date) {
      updateData.start_time = new Date(`${data.date}T${data.start_time}`);
    }

    if (data.end_time && data.date) {
      updateData.end_time = new Date(`${data.date}T${data.end_time}`);
    }

    if (data.fee !== undefined) {
      updateData.fee = data.fee ? Number(data.fee) : null;
    }

    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (updateData.start_time && updateData.end_time) {
      if (updateData.end_time <= updateData.start_time) {
        throw new Error('End time must be after start time');
      }
    }

    return await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        group: true,
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });
  }

  static async deleteEvent(id: string) {
    return await prisma.event.delete({
      where: { id }
    });
  }

  static async getEventsByGroup(groupId: string, params?: {
    start?: string;
    end?: string;
    status?: string;
  }) {
    const { start, end, status } = params || {};
    
    const where: any = {
      group_id: groupId
    };
    
    if (status) where.status = status;
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    return await prisma.event.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });
  }

  static async getUpcomingEvents(groupIds?: string[], limit: number = 10) {
    const where: any = {
      date: {
        gte: new Date()
      },
      status: {
        in: ['PROPOSED', 'CONFIRMED']
      }
    };

    if (groupIds && groupIds.length > 0) {
      where.group_id = {
        in: groupIds
      };
    }

    return await prisma.event.findMany({
      where,
      include: {
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
      },
      take: limit
    });
  }

  static async getEventStatistics(groupId?: string) {
    const where: any = {};
    if (groupId) where.group_id = groupId;

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const [totalEvents, thisMonthEvents, confirmedEvents, proposedEvents] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.count({
        where: {
          ...where,
          date: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        }
      }),
      prisma.event.count({
        where: {
          ...where,
          status: 'CONFIRMED'
        }
      }),
      prisma.event.count({
        where: {
          ...where,
          status: 'PROPOSED'
        }
      })
    ]);

    return {
      total_events: totalEvents,
      this_month_events: thisMonthEvents,
      confirmed_events: confirmedEvents,
      proposed_events: proposedEvents
    };
  }
}