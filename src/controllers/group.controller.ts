import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { GroupService } from '../services/group.service';

export class GroupController {
  static async getAllGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const groups = await GroupService.getAllGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async getGroupById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const group = await GroupService.getGroupById(id);
      
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }

      const userGroups = await GroupService.getUserGroups(req.user?.userId || '');
      const isGroupMember = userGroups.some(ug => ug.id === id);

      if (req.user?.role !== 'ADMIN' && !isGroupMember) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(group);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async createGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, type, description, genre, logo_url, contact_email, contact_phone } = req.body;

      if (!name || !type) {
        return res.status(400).json({ error: 'Name and type are required' });
      }

      const group = await GroupService.createGroup({
        name,
        type,
        description,
        genre,
        logo_url,
        contact_email,
        contact_phone
      });

      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async updateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, type, description, genre, logo_url, contact_email, contact_phone } = req.body;

      const group = await GroupService.updateGroup(id, {
        name,
        type,
        description,
        genre,
        logo_url,
        contact_email,
        contact_phone
      });

      res.json(group);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async deleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      await GroupService.deleteGroup(id);
      res.json({ message: 'Group deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      console.log('🔍 AddMember chiamato con:', { groupId: id, userId, body: req.body });

      if (!userId) {
        return res.status(400).json({ error: 'User ID è obbligatorio' });
      }

      const membership = await GroupService.addMemberToGroup(id, userId);
      res.status(201).json(membership);
    } catch (error) {
      console.error('❌ Errore in addMember:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { id, userId } = req.params;
      await GroupService.removeMemberFromGroup(id, userId);
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async joinGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const membership = await GroupService.addMemberToGroup(id, userId);
      res.status(201).json(membership);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async leaveGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await GroupService.removeMemberFromGroup(id, userId);
      res.json({ message: 'Left group successfully' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async getUserGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const groups = await GroupService.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}