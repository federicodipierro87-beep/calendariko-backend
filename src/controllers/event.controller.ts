import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { EventService } from '../services/event.service';
import { GroupService } from '../services/group.service';
// import { sendEventNotification } from '../services/email.service'; // Temporaneamente disabilitato

export class EventController {
  static async getAllEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const { start, end, groupId, status } = req.query;
      
      let finalGroupId = groupId as string;

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.id);
        
        if (finalGroupId && !userGroupIds.includes(finalGroupId)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
        
        if (!finalGroupId && userGroupIds.length > 0) {
          const events = await Promise.all(
            userGroupIds.map(groupId => 
              EventService.getEventsByGroup(groupId, {
                start: start as string,
                end: end as string,
                status: status as string
              })
            )
          );
          
          return res.json(events.flat());
        }
      }

      const events = await EventService.getAllEvents({
        start: start as string,
        end: end as string,
        groupId: finalGroupId,
        status: status as string
      });

      res.json(events);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getEventById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);
      
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.id);
        
        if (event.group_id && !userGroupIds.includes(event.group_id)) {
          return res.status(403).json({ error: 'Access denied to this event' });
        }
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const {
        title,
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee,
        status,
        notes
      } = req.body;

      console.log('Event creation request body:', req.body);

      if (!title || !date || !start_time || !end_time || !venue_name || !venue_city) {
        console.log('Missing required fields check:', { title, date, start_time, end_time, venue_name, venue_city });
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const event = await EventService.createEvent({
        title,
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee,
        status,
        notes,
        created_by: req.user?.userId!
      });

      // Email temporaneamente disabilitato per performance
      if (group_id && false) { // Disabilitato temporaneamente
        console.log('📧 Email service temporaneamente disabilitato per migliorare performance');
      } else {
        console.log('📧 Email service disabilitato - evento creato senza notifiche');
      }

      res.status(201).json(event);
    } catch (error) {
      console.error('Event creation error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async updateEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const {
        title,
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee,
        status,
        notes
      } = req.body;

      if (req.user?.role === 'ARTIST') {
        const event = await EventService.getEventById(id);
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.id);
        
        if (event.group_id && !userGroupIds.includes(event.group_id)) {
          return res.status(403).json({ error: 'Access denied to this event' });
        }

        if (event.created_by !== req.user.userId) {
          return res.status(403).json({ error: 'Only event creator or admin can modify events' });
        }
      }

      const updatedEvent = await EventService.updateEvent(id, {
        title,
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee,
        status,
        notes
      });

      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async deleteEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (req.user?.role === 'ARTIST') {
        const event = await EventService.getEventById(id);
        if (!event) {
          return res.status(404).json({ error: 'Event not found' });
        }

        if (event.created_by !== req.user.userId) {
          return res.status(403).json({ error: 'Only event creator or admin can delete events' });
        }
      }

      await EventService.deleteEvent(id);
      res.json({ message: 'Event deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getUpcomingEvents(req: AuthenticatedRequest, res: Response) {
    try {
      const { limit } = req.query;
      
      let groupIds: string[] | undefined;

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        groupIds = userGroups.map(ug => ug.id);
      }

      const events = await EventService.getUpcomingEvents(
        groupIds,
        limit ? parseInt(limit as string) : 10
      );

      res.json(events);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getEventStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId } = req.query;
      
      let finalGroupId = groupId as string;

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.id);
        
        if (finalGroupId && !userGroupIds.includes(finalGroupId)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
      }

      const statistics = await EventService.getEventStatistics(finalGroupId);
      res.json(statistics);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}