import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';
import { EmailService } from '../services/email.service';

const prisma = new PrismaClient();

export class EventController {
  static async getAllEvents(req: AuthenticatedRequest, res: Response) {
    try {
      let whereClause: any;

      if (req.user?.role === 'ADMIN') {
        // Admin: nessun filtro, mostra tutti gli eventi
        whereClause = {};
      } else {
        // Utente normale: eventi propri OPPURE eventi dei gruppi di cui è membro
        // Prima recupera i gruppi di cui l'utente è membro
        const userGroups = await prisma.userGroup.findMany({
          where: { userId: req.user?.id },
          select: { groupId: true }
        });
        const userGroupIds = userGroups.map(ug => ug.groupId);

        console.log(`👤 Utente ${req.user?.email} è membro di ${userGroupIds.length} gruppi:`, userGroupIds);

        // Filtra eventi dove:
        // - userId è l'utente corrente (eventi creati dall'utente)
        // - OPPURE groupId è uno dei gruppi di cui l'utente è membro
        whereClause = {
          OR: [
            { userId: req.user?.id }, // Eventi creati dall'utente
            { groupId: { in: userGroupIds } } // Eventi assegnati ai gruppi dell'utente
          ]
        };
      }

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
      // Valori validi per EventStatus secondo lo schema Prisma
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];

      // Gestisce sia il formato nuovo (Prisma) che quello vecchio (frontend esistente)
      const {
        title,
        description,
        startTime,
        endTime,
        location,
        groupId,
        status, // Campo status dal frontend
        // Formato vecchio dal frontend
        event_type,
        date,
        start_time,
        end_time,
        venue_name,
        group_id,
        notes,
        fee,
        contact_responsible
      } = req.body;
      
      // Normalizza i dati per il database Prisma
      const eventTitle = title || req.body.title;
      const eventDescription = description || notes || '';
      const eventLocation = location || venue_name || '';
      const eventGroupId = groupId || group_id;
      
      // Gestisce le date - se arrivano separate le combina
      let eventStartTime: Date;
      let eventEndTime: Date;
      
      if (startTime) {
        eventStartTime = new Date(startTime);
      } else if (date && start_time) {
        // Crea timestamp assumendo fuso orario Europe/Rome per evitare conversioni UTC
        const dateTimeString = `${date}T${start_time}:00`;
        
        // Crea la data specificando esplicitamente che è in timezone locale italiano
        // Aggiunge offset timezone manualmente per evitare conversioni automatiche
        const tempDate = new Date(dateTimeString);
        const timezoneOffset = 60; // CET/CEST offset in minuti (1 ora)
        eventStartTime = new Date(tempDate.getTime() - (timezoneOffset * 60 * 1000));
        
        console.log(`🕐 Start time: ${date}T${start_time}:00`);
        console.log(`🕐 Temp date: ${tempDate.toISOString()}`);
        console.log(`🕐 Final start time (offset applied): ${eventStartTime.toISOString()}`);
        console.log(`🕐 Final start time local: ${eventStartTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
      } else {
        throw new Error('startTime or date+start_time required');
      }
      
      if (endTime) {
        eventEndTime = new Date(endTime);
      } else if (date && end_time) {
        // Crea timestamp assumendo fuso orario Europe/Rome per evitare conversioni UTC
        const dateTimeString = `${date}T${end_time}:00`;
        
        // Crea la data specificando esplicitamente che è in timezone locale italiano
        // Aggiunge offset timezone manualmente per evitare conversioni automatiche
        const tempDate = new Date(dateTimeString);
        const timezoneOffset = 60; // CET/CEST offset in minuti (1 ora)
        eventEndTime = new Date(tempDate.getTime() - (timezoneOffset * 60 * 1000));
        
        console.log(`🕐 End time: ${date}T${end_time}:00`);
        console.log(`🕐 Temp date: ${tempDate.toISOString()}`);
        console.log(`🕐 Final end time (offset applied): ${eventEndTime.toISOString()}`);
        console.log(`🕐 Final end time local: ${eventEndTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`);
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
      console.log('🕐 Orari creati:', {
        startTimeString: eventStartTime.toISOString(),
        endTimeString: eventEndTime.toISOString(),
        startTimeLocal: eventStartTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
        endTimeLocal: eventEndTime.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
      });
      
      // Valida e normalizza lo status - usa PENDING come default
      const eventStatus = validStatuses.includes(status) ? status : 'PENDING';
      console.log(`📋 Status ricevuto: "${status}" -> Status utilizzato: "${eventStatus}"`);

      // Crea un nuovo evento nel database
      const newEvent = await prisma.event.create({
        data: {
          title: eventTitle,
          description: eventDescription,
          startTime: eventStartTime,
          endTime: eventEndTime,
          location: eventLocation,
          groupId: eventGroupId,
          status: eventStatus,
          fee: fee ? (typeof fee === 'string' ? parseInt(fee, 10) : Math.round(fee)) : null,
          contact_responsible: contact_responsible || null,
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
        await EventController.sendEventNotifications(newEvent);
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
      // Valori validi per EventStatus secondo lo schema Prisma
      const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED'];

      const { id } = req.params;
      const eventData = req.body;

      console.log(`📝 [Railway DB] Aggiornamento evento ID: ${id}`);
      console.log('📝 Dati ricevuti:', eventData);

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

      // Normalizza i dati per l'aggiornamento (supporta sia formato nuovo che vecchio)
      const updateData: any = {};

      if (eventData.title) updateData.title = eventData.title;
      if (eventData.description) updateData.description = eventData.description;
      if (eventData.location || eventData.venue_name) updateData.location = eventData.location || eventData.venue_name;
      if (eventData.groupId || eventData.group_id) updateData.groupId = eventData.groupId || eventData.group_id;

      // Valida lo status - accetta solo valori validi
      if (eventData.status) {
        if (validStatuses.includes(eventData.status)) {
          updateData.status = eventData.status;
        } else {
          console.log(`⚠️ Status non valido ricevuto: "${eventData.status}" - ignorato`);
        }
      }
      
      // Gestisce fee (cachet) - può essere 0 quindi controllo !== undefined
      if (eventData.fee !== undefined) {
        updateData.fee = typeof eventData.fee === 'string' ? parseInt(eventData.fee, 10) : Math.round(eventData.fee);
      }
      
      // Gestisce contact_responsible 
      if (eventData.contact_responsible !== undefined) {
        updateData.contact_responsible = eventData.contact_responsible;
      }
      
      // Gestisce i timestamp combinando data e ora se necessario
      if (eventData.startTime) {
        updateData.startTime = new Date(eventData.startTime);
      } else if (eventData.date && eventData.start_time) {
        const dateTimeString = `${eventData.date}T${eventData.start_time}:00`;
        const tempDate = new Date(dateTimeString);
        const timezoneOffset = 60; // CET/CEST offset in minuti (1 ora)
        updateData.startTime = new Date(tempDate.getTime() - (timezoneOffset * 60 * 1000));
        console.log(`🕐 Update start time: ${dateTimeString} -> ${updateData.startTime.toISOString()}`);
      }
      
      if (eventData.endTime) {
        updateData.endTime = new Date(eventData.endTime);
      } else if (eventData.date && eventData.end_time) {
        const dateTimeString = `${eventData.date}T${eventData.end_time}:00`;
        const tempDate = new Date(dateTimeString);
        const timezoneOffset = 60; // CET/CEST offset in minuti (1 ora)
        updateData.endTime = new Date(tempDate.getTime() - (timezoneOffset * 60 * 1000));
        console.log(`🕐 Update end time: ${dateTimeString} -> ${updateData.endTime.toISOString()}`);
      }
      
      console.log('📝 Dati normalizzati per aggiornamento:', updateData);
      
      // Aggiorna l'evento nel database
      const updatedEvent = await prisma.event.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        }
      });
      
      console.log(`✅ [Railway DB] Evento ${id} aggiornato con successo`);
      
      // Invia email di notifica per la modifica
      try {
        console.log('📧 Tentativo di invio email per evento modificato');
        await EventController.sendEventUpdateNotification(updatedEvent);
        console.log('✅ Email di modifica inviate con successo');
      } catch (emailError: any) {
        console.error('⚠️ Errore nell\'invio email per modifica evento:', emailError);
        console.error('⚠️ Stack trace:', emailError.stack);
        // Non interrompe l'aggiornamento dell'evento se l'email fallisce
      }
      
      res.status(200).json(updatedEvent);
      
    } catch (error: any) {
      console.error('❌ Errore nell\'aggiornamento dell\'evento:', error);
      res.status(500).json({
        success: false,
        message: `Errore interno del server: ${error.message}`
      });
    }
  }

  static async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      console.log(`🗑️ [Railway DB] Tentativo di eliminazione evento ID: ${id}`);
      
      // Verifica se l'evento esiste e recupera i dati completi per l'email
      const existingEvent = await prisma.event.findUnique({
        where: { id },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true }
          },
          group: {
            select: { id: true, name: true, color: true }
          }
        }
      });
      
      if (!existingEvent) {
        console.log(`❌ Evento ${id} non trovato nel database`);
        return res.status(404).json({
          success: false,
          message: 'Evento non trovato'
        });
      }
      
      // Invia email di notifica PRIMA di eliminare l'evento
      try {
        console.log('📧 Tentativo di invio email per evento eliminato');
        await EventController.sendEventDeleteNotification(existingEvent);
        console.log('✅ Email di eliminazione inviate con successo');
      } catch (emailError: any) {
        console.error('⚠️ Errore nell\'invio email per eliminazione evento:', emailError);
        console.error('⚠️ Stack trace:', emailError.stack);
        // Non interrompe l'eliminazione dell'evento se l'email fallisce
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
        organizerName: event.user ? `${event.user.firstName} ${event.user.lastName}` : undefined,
        fee: event.fee || undefined,
        contactResponsible: event.contact_responsible || undefined,
        notes: event.description || undefined  // Le note sono spesso salvate in description
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

  private static async sendEventUpdateNotification(event: any): Promise<void> {
    try {
      console.log('📧 Preparazione invio email per modifica evento:', event.title);

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
        console.log('⚠️ Nessun destinatario trovato per la modifica evento');
        return;
      }

      console.log(`📧 Invio email modifica a ${recipientEmails.length} destinatari:`, recipientEmails);

      // Prepara i dati per l'email
      const eventData = {
        eventTitle: event.title,
        eventDescription: event.description || undefined,
        eventLocation: event.location || undefined,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        groupName: event.group?.name || undefined,
        organizerName: event.user ? `${event.user.firstName} ${event.user.lastName}` : undefined,
        fee: event.fee || undefined,
        contactResponsible: event.contact_responsible || undefined,
        notes: event.description || undefined  // Le note sono spesso salvate in description
      };

      // Invia la email di modifica
      await EmailService.sendEventUpdateNotification(recipientEmails, eventData);
      console.log('✅ Email modifica evento inviata con successo');

    } catch (error) {
      console.error('❌ Errore nell\'invio email modifica evento:', error);
      throw error;
    }
  }

  private static async sendEventDeleteNotification(event: any): Promise<void> {
    try {
      console.log('📧 Preparazione invio email per eliminazione evento:', event.title);

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
        console.log('⚠️ Nessun destinatario trovato per l\'eliminazione evento');
        return;
      }

      console.log(`📧 Invio email eliminazione a ${recipientEmails.length} destinatari:`, recipientEmails);

      // Prepara i dati per l'email
      const eventData = {
        eventTitle: event.title,
        eventDescription: event.description || undefined,
        eventLocation: event.location || undefined,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        groupName: event.group?.name || undefined,
        organizerName: event.user ? `${event.user.firstName} ${event.user.lastName}` : undefined,
        fee: event.fee || undefined,
        contactResponsible: event.contact_responsible || undefined,
        notes: event.description || undefined  // Le note sono spesso salvate in description
      };

      // Invia la email di eliminazione
      await EmailService.sendEventDeleteNotification(recipientEmails, eventData);
      console.log('✅ Email eliminazione evento inviata con successo');

    } catch (error) {
      console.error('❌ Errore nell\'invio email eliminazione evento:', error);
      throw error;
    }
  }
}