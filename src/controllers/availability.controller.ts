import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { AvailabilityService } from '../services/availability.service';
import { GroupService } from '../services/group.service';

export class AvailabilityController {
  static async getAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId, groupId, start, end } = req.query;
      
      let finalUserId = userId as string;
      let finalGroupId = groupId as string;

      if (req.user?.role === 'ARTIST') {
        finalUserId = req.user.userId;
        
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.group_id);
        
        if (finalGroupId && !userGroupIds.includes(finalGroupId)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
      }

      const availability = await AvailabilityService.getAvailability({
        userId: finalUserId,
        groupId: finalGroupId,
        start: start as string,
        end: end as string
      });

      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async createAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { group_id, date, type, notes } = req.body;
      const user_id = req.user?.userId;

      if (!user_id || !group_id || !date || !type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(user_id);
        const userGroupIds = userGroups.map(ug => ug.group_id);
        
        if (!userGroupIds.includes(group_id)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
      }

      // Map frontend types to database enum values
      const mappedType = type === 'BUSY' ? 'UNAVAILABLE' : type;

      const availability = await AvailabilityService.createAvailability({
        user_id,
        group_id,
        date,
        type: mappedType,
        notes
      });

      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async createBulkAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { group_id, dates, type, notes } = req.body;
      const user_id = req.user?.userId;

      if (!user_id || !group_id || !dates || !Array.isArray(dates) || !type) {
        return res.status(400).json({ error: 'Missing required fields or invalid dates array' });
      }

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(user_id);
        const userGroupIds = userGroups.map(ug => ug.group_id);
        
        if (!userGroupIds.includes(group_id)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
      }

      // Map frontend types to database enum values
      const mappedType = type === 'BUSY' ? 'UNAVAILABLE' : type;

      const availability = await AvailabilityService.createBulkAvailability({
        user_id,
        group_id,
        dates,
        type: mappedType,
        notes
      });

      res.status(201).json(availability);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async updateAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { type, notes } = req.body;

      if (req.user?.role === 'ARTIST') {
        const existingAvailability = await AvailabilityService.getAvailability({ userId: req.user.userId });
        const userAvailability = existingAvailability.find(a => a.id === id);
        
        if (!userAvailability) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      // Map frontend types to database enum values
      const mappedType = type === 'BUSY' ? 'UNAVAILABLE' : type;

      const availability = await AvailabilityService.updateAvailability(id, {
        type: mappedType,
        notes
      });

      res.json(availability);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async deleteAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      if (req.user?.role === 'ARTIST') {
        const existingAvailability = await AvailabilityService.getAvailability({ userId: req.user.userId });
        const userAvailability = existingAvailability.find(a => a.id === id);
        
        if (!userAvailability) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      await AvailabilityService.deleteAvailability(id);
      res.json({ message: 'Availability deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getGroupAvailabilityOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.group_id);
        
        if (!userGroupIds.includes(groupId)) {
          return res.status(403).json({ error: 'Access denied to this group' });
        }
      }

      const overview = await AvailabilityService.getGroupAvailabilityOverview(groupId, date as string);
      res.json(overview);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}