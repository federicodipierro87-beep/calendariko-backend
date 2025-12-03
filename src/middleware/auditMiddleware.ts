import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    email: string;
  };
}

// Helper per estrarre l'azione dai path e metodi
const getActionFromRequest = (method: string, path: string): string => {
  const normalizedPath = path.toLowerCase();
  
  if (method === 'POST') {
    if (normalizedPath.includes('/users')) return 'CREATE_USER';
    if (normalizedPath.includes('/groups')) return 'CREATE_GROUP';
    if (normalizedPath.includes('/events')) return 'CREATE_EVENT';
    if (normalizedPath.includes('/unlock')) return 'UNLOCK_USER';
    if (normalizedPath.includes('/join')) return 'JOIN_GROUP';
    if (normalizedPath.includes('/members')) return 'ADD_GROUP_MEMBER';
  }
  
  if (method === 'PUT') {
    if (normalizedPath.includes('/users')) return 'UPDATE_USER';
    if (normalizedPath.includes('/groups')) return 'UPDATE_GROUP';
    if (normalizedPath.includes('/events')) return 'UPDATE_EVENT';
    if (normalizedPath.includes('/change-password')) return 'CHANGE_USER_PASSWORD';
  }
  
  if (method === 'DELETE') {
    if (normalizedPath.includes('/users')) return 'DELETE_USER';
    if (normalizedPath.includes('/groups')) return 'DELETE_GROUP';
    if (normalizedPath.includes('/events')) return 'DELETE_EVENT';
    if (normalizedPath.includes('/members')) return 'REMOVE_GROUP_MEMBER';
    if (normalizedPath.includes('/leave')) return 'LEAVE_GROUP';
  }
  
  if (method === 'POST' && normalizedPath.includes('/apply-schema')) return 'APPLY_DATABASE_SCHEMA';
  
  return `${method}_${normalizedPath.split('/').pop()?.toUpperCase() || 'UNKNOWN'}`;
};

// Helper per estrarre l'entità
const getEntityFromRequest = (path: string): string => {
  const normalizedPath = path.toLowerCase();
  
  if (normalizedPath.includes('/users')) return 'USER';
  if (normalizedPath.includes('/groups')) return 'GROUP';
  if (normalizedPath.includes('/events')) return 'EVENT';
  if (normalizedPath.includes('/availability')) return 'AVAILABILITY';
  if (normalizedPath.includes('/notifications')) return 'NOTIFICATION';
  if (normalizedPath.includes('/admin')) return 'SYSTEM';
  
  return 'UNKNOWN';
};

// Helper per estrarre l'ID dell'entità
const getEntityIdFromRequest = (path: string, body: any, params: any): string | undefined => {
  // Prova a estrarre l'ID dai parametri della route
  if (params?.id) return params.id;
  if (params?.userId) return params.userId;
  if (params?.groupId) return params.groupId;
  if (params?.eventId) return params.eventId;
  
  // Prova a estrarre l'ID dal body
  if (body?.id) return body.id;
  if (body?.userId) return body.userId;
  if (body?.groupId) return body.groupId;
  if (body?.eventId) return body.eventId;
  
  // Estrae l'ID dal path usando regex
  const idMatch = path.match(/\/([a-zA-Z0-9_-]+)(?:\/|$)/g);
  if (idMatch && idMatch.length > 1) {
    const lastSegment = idMatch[idMatch.length - 1].replace(/\//g, '');
    if (lastSegment.length > 10) return lastSegment; // Probabilmente un ID
  }
  
  return undefined;
};

export const auditMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Solo per admin e solo per operazioni che modificano dati
  if (req.user?.role !== 'ADMIN' || req.method === 'GET') {
    return next();
  }

  // Salva i dati originali per il confronto
  const originalSend = res.send;
  const originalJson = res.json;
  let responseBody: any;

  // Intercetta la risposta
  res.send = function (body: any) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.json = function (body: any) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Esegui l'operazione
  const originalEnd = res.end;
  res.end = function (...args: any[]) {
    // Log dell'audit dopo che l'operazione è completata
    setImmediate(async () => {
      try {
        const action = getActionFromRequest(req.method, req.path);
        const entity = getEntityFromRequest(req.path);
        const entityId = getEntityIdFromRequest(req.path, req.body, req.params);
        const success = res.statusCode >= 200 && res.statusCode < 400;
        
        const auditData = {
          action,
          entity,
          entityId,
          adminId: req.user!.id,
          details: {
            method: req.method,
            path: req.path,
            requestBody: req.body,
            responseStatus: res.statusCode,
            ...(success && responseBody ? { responseData: responseBody } : {}),
          },
          success,
          errorMessage: !success ? JSON.stringify(responseBody) : undefined,
        };

        await AuditService.logAction(auditData, req);
      } catch (error) {
        console.error('Error in audit middleware:', error);
      }
    });

    return originalEnd.apply(this, args);
  };

  next();
};

// Middleware per log specifici (da usare manualmente quando serve più controllo)
export const logAuditAction = (action: string, entity: string, entityId?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Solo per admin
    if (req.user?.role !== 'ADMIN') {
      return next();
    }

    try {
      await AuditService.logAction({
        action,
        entity,
        entityId,
        adminId: req.user.id,
        details: {
          method: req.method,
          path: req.path,
          requestBody: req.body,
        },
      }, req);
    } catch (error) {
      console.error('Error logging audit action:', error);
    }

    next();
  };
};