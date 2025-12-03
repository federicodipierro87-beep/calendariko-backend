import { PrismaClient } from '@prisma/client';
import { Request } from 'express';

const prisma = new PrismaClient();

export interface AuditLogData {
  action: string;
  entity: string;
  entityId?: string;
  adminId: string;
  details?: any;
  success?: boolean;
  errorMessage?: string;
}

export class AuditService {
  static async logAction(data: AuditLogData, req?: Request) {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          adminId: data.adminId,
          details: data.details,
          success: data.success ?? true,
          errorMessage: data.errorMessage,
          ipAddress: req?.ip || req?.socket?.remoteAddress,
          userAgent: req?.get('User-Agent'),
        },
      });

      console.log(`🔍 Audit log created: ${data.action} on ${data.entity} by admin ${data.adminId}`);
      return auditLog;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Non vogliamo che un errore di audit blocchi l'operazione principale
      return null;
    }
  }

  static async getAuditLogs(filters: {
    adminId?: string;
    action?: string;
    entity?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        adminId,
        action,
        entity,
        startDate,
        endDate,
        page = 1,
        limit = 50
      } = filters;

      const skip = (page - 1) * limit;

      const where: any = {};
      
      if (adminId) where.adminId = adminId;
      if (action) where.action = { contains: action, mode: 'insensitive' };
      if (entity) where.entity = entity;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            admin: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      throw new Error('Failed to retrieve audit logs');
    }
  }

  static async getAdminActivity(adminId: string, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await prisma.auditLog.findMany({
        where: {
          adminId,
          createdAt: {
            gte: startDate,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // Limit per performance
      });

      // Raggruppa per azione
      const actionCounts = logs.reduce((acc: any, log) => {
        acc[log.action] = (acc[log.action] || 0) + 1;
        return acc;
      }, {});

      return {
        totalActions: logs.length,
        actionBreakdown: actionCounts,
        recentLogs: logs.slice(0, 10), // Ultimi 10 per preview
      };
    } catch (error) {
      console.error('Error retrieving admin activity:', error);
      throw new Error('Failed to retrieve admin activity');
    }
  }
}