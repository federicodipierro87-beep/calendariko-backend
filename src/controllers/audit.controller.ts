import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

export class AuditController {
  static async getAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admin possono vedere i log audit
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const {
        adminId,
        action,
        entity,
        startDate,
        endDate,
        page = '1',
        limit = '50'
      } = req.query;

      const filters = {
        adminId: adminId as string,
        action: action as string,
        entity: entity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100), // Max 100 per richiesta
      };

      const result = await AuditService.getAuditLogs(filters);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({ 
        error: 'Errore nel recupero dei log audit',
        details: error.message 
      });
    }
  }

  static async getAdminActivity(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admin possono vedere l'attività
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const { adminId } = req.params;
      const { days = '30' } = req.query;

      // Admin possono vedere solo la propria attività, a meno che non sia specificato un altro admin
      const targetAdminId = adminId || req.user.id;

      const activity = await AuditService.getAdminActivity(
        targetAdminId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: activity
      });
    } catch (error: any) {
      console.error('Error retrieving admin activity:', error);
      res.status(500).json({ 
        error: 'Errore nel recupero dell\'attività admin',
        details: error.message 
      });
    }
  }

  static async getAuditStats(req: AuthenticatedRequest, res: Response) {
    try {
      // Solo admin possono vedere le statistiche
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Accesso negato' });
      }

      const { days = '30' } = req.query;
      const daysNum = parseInt(days as string);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      const filters = {
        startDate,
        limit: 1000, // Per le statistiche
      };

      const { logs } = await AuditService.getAuditLogs(filters);

      // Calcola statistiche
      const stats = {
        totalActions: logs.length,
        actionsByType: logs.reduce((acc: any, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {}),
        actionsByEntity: logs.reduce((acc: any, log) => {
          acc[log.entity] = (acc[log.entity] || 0) + 1;
          return acc;
        }, {}),
        actionsByAdmin: logs.reduce((acc: any, log) => {
          const adminName = `${log.admin.firstName} ${log.admin.lastName}`;
          acc[adminName] = (acc[adminName] || 0) + 1;
          return acc;
        }, {}),
        actionsPerDay: logs.reduce((acc: any, log) => {
          const day = log.createdAt.toISOString().split('T')[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {}),
        successRate: logs.length > 0 
          ? (logs.filter(log => log.success).length / logs.length) * 100 
          : 100,
      };

      res.json({
        success: true,
        data: stats,
        period: `${daysNum} giorni`
      });
    } catch (error: any) {
      console.error('Error retrieving audit stats:', error);
      res.status(500).json({ 
        error: 'Errore nel recupero delle statistiche audit',
        details: error.message 
      });
    }
  }
}