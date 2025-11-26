import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();

export class EventController {
  static async getAllEvents(req: AuthenticatedRequest, res: Response) {
    try {
      // Gli admin possono vedere tutti gli eventi, gli altri utenti solo i propri
      const whereClause = req.user?.role === 'ADMIN' 
        ? {} // Admin: nessun filtro, mostra tutti gli eventi
        : { userId: req.user?.id }; // Altri utenti: solo i propri eventi
      
      const events = await prisma.event.findMany({
        where: whereClause,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        },
        orderBy: { startTime: 'asc' }
      });
      
      console.log(`📅 [Railway DB] Recuperati ${events.length} eventi per utente ${req.user?.role}: ${req.user?.email}`);
      res.status(200).json(events);
    } catch (error: any) {
      console.error('Errore nel recupero degli eventi:', error);
      // Se la tabella non esiste ancora, restituisci array vuoto
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return res.status(200).json([]);
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      // Per ora restituiamo null (evento non trovato)
      // In futuro qui implementeremo la logica per recuperare l'evento specifico
      res.status(404).json({
        success: false,
        message: 'Evento non trovato'
      });
    } catch (error) {
      console.error('Errore nel recupero dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async createEvent(req: AuthenticatedRequest, res: Response) {
    try {
      // Gestisce sia il formato nuovo (Prisma) che quello vecchio (frontend esistente)
      const {
        title,
        description,
        startTime,
        endTime,
        location,
        groupId,
        // Formato vecchio dal frontend
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        group_id,
        notes
      } = req.body;
      
      // Normalizza i dati per il database Prisma
      const eventTitle = title || req.body.title;
      const eventDescription = description || event_type || notes || '';
      const eventLocation = location || venue_name || '';
      const eventGroupId = groupId || group_id;
      
      // Gestisce le date - se arrivano separate le combina
      let eventStartTime: Date;
      let eventEndTime: Date;
      
      if (startTime) {
        eventStartTime = new Date(startTime);
      } else if (date && start_time) {
        eventStartTime = new Date(`${date}T${start_time}`);
      } else {
        throw new Error('startTime or date+start_time required');
      }
      
      if (endTime) {
        eventEndTime = new Date(endTime);
      } else if (date && end_time) {
        eventEndTime = new Date(`${date}T${end_time}`);
      } else {
        throw new Error('endTime or date+end_time required');
      }
      
      console.log('📝 Dati evento normalizzati:', {
        title: eventTitle,
        description: eventDescription,
        startTime: eventStartTime,
        endTime: eventEndTime,
        location: eventLocation,
        groupId: eventGroupId,
        userId: req.user!.id
      });
      
      // Crea un nuovo evento nel database
      const newEvent = await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          startTime: eventStartTime,
          endTime: eventEndTime,
          location: eventLocation,
          groupId: eventGroupId,
          userId: req.user!.id
        },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        }
      });
      
      console.log('✅ [Railway DB] Evento creato:', newEvent);

      // Invia email di notifica a tutti i membri del gruppo (se esiste)
      try {
        console.log('🚀 Tentativo di invio email per evento creato');
        await this.sendEventNotifications(newEvent);
        console.log('✅ Email inviate con successo');
      } catch (emailError: any) {
        console.error('⚠️ Errore nell\'invio email per evento:', emailError);
        console.error('⚠️ Stack trace:', emailError.stack);
        // Non interrompe la creazione dell'evento se l'email fallisce
      }

      res.status(201).json(newEvent);
    } catch (error: any) {
      console.error('❌ Errore nella creazione dell\'evento:', error);
      // Se la tabella non esiste ancora, restituisci errore specifico
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return res.status(400).json({
          success: false,
          message: 'Database tables not yet created. Please run migration first.'
        });
      }
      res.status(500).json({
        success: false,
        message: `Errore interno del server: ${error.message}`
      });
    }
  }

  static async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const eventData = req.body;
      
      // Per ora restituiamo un errore 404
      // In futuro qui implementeremo la logica per aggiornare l'evento nel database
      res.status(404).json({
        success: false,
        message: 'Evento non trovato'
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ [Railway DB] Tentativo di eliminazione evento ID: ${id}`);
      
      // Verifica se l'evento esiste
      const existingEvent = await prisma.event.findUnique({
        where: { id }
      });
      
      if (!existingEvent) {
        console.log(`❌ Evento ${id} non trovato nel database`);
        return res.status(404).json({
          success: false,
          message: 'Evento non trovato'
        });
      }
      
      // Elimina l'evento dal database
      await prisma.event.delete({
        where: { id }
      });
      
      console.log(`✅ [Railway DB] Evento ${id} eliminato con successo`);
      res.status(200).json({
        success: true,
        message: 'Evento eliminato con successo'
      });
    } catch (error: any) {
      console.error('❌ Errore nell\'eliminazione dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: `Errore interno del server: ${error.message}`
      });
    }
  }

  private static async sendEventNotifications(event: any): Promise<void> {
    try {
      console.log('📧 Preparazione invio email per evento:', event.title);
      console.log('📧 Event data received:', JSON.stringify(event, null, 2));

      // Lista email destinatari
      const recipientEmails: string[] = [];

      // Aggiungi l'email dell'organizzatore
      if (event.user && event.user.email) {
        recipientEmails.push(event.user.email);
        console.log('📧 Aggiunto organizzatore:', event.user.email);
      }

      // Se l'evento ha un gruppo, aggiungi tutti i membri del gruppo
      if (event.groupId) {
        const groupWithMembers = await prisma.group.findUnique({
          where: { id: event.groupId },
          include: {
            members: {
              include: {
                user: {
                  select: { email: true, firstName: true, lastName: true }
                }
              }
            }
          }
        });

        if (groupWithMembers && groupWithMembers.members) {
          for (const member of groupWithMembers.members) {
            if (member.user.email && !recipientEmails.includes(member.user.email)) {
              recipientEmails.push(member.user.email);
              console.log('📧 Aggiunto membro gruppo:', member.user.email);
            }
          }
        }
      }

      // Se non ci sono destinatari, non inviare email
      if (recipientEmails.length === 0) {
        console.log('⚠️ Nessun destinatario trovato per l\'evento');
        return;
      }

      console.log(`📧 Invio email a ${recipientEmails.length} destinatari:`, recipientEmails);

      // Prepara i dati per l'email
      const eventData = {
        eventTitle: event.title,
        eventDescription: event.description || undefined,
        eventLocation: event.location || undefined,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        groupName: event.group?.name || undefined,
        organizerName: event.user ? `${event.user.firstName} ${event.user.lastName}` : undefined
      };

      // Invia la email
      console.log('📧 Chiamando EmailService.sendEventNotification...');
      await EmailService.sendEventNotification(recipientEmails, eventData);
      console.log('✅ Email evento inviata con successo');

    } catch (error) {
      console.error('❌ Errore nell\'invio email evento:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }
}