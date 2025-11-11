import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { EventService } from '../services/event.service';
import { GroupService } from '../services/group.service';
import { sendEventNotification } from '../services/email.service';

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

      // Invio notifiche email se il gruppo è specificato
      if (group_id) {
        // Invia email in background per non rallentare la risposta
        setImmediate(async () => {
          try {
            console.log('📧 Invio notifiche email per evento creato...');
            
            // Ottieni i membri del gruppo per inviare le email
            const groupWithMembers = await GroupService.getGroupById(group_id);
            if (groupWithMembers && groupWithMembers.user_groups) {
              console.log(`📧 Invio email a ${groupWithMembers.user_groups.length} membri del gruppo ${groupWithMembers.name}`);
              
              for (const membership of groupWithMembers.user_groups) {
                try {
                  await sendEventNotification({
                    to: membership.user.email,
                    userName: `${membership.user.first_name} ${membership.user.last_name}`,
                    eventTitle: event.title,
                    eventDate: event.date.toLocaleDateString('it-IT'),
                    eventTime: event.start_time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                    venueName: event.venue_name,
                    venueCity: event.venue_city || 'Milano',
                    groupName: groupWithMembers.name,
                    creatorName: 'Admin',
                    notes: event.notes || 'Nessuna nota aggiuntiva'
                  });
                  console.log(`✅ Email inviata a ${membership.user.email}`);
                } catch (memberEmailError) {
                  console.error(`❌ Errore invio email a ${membership.user.email}:`, memberEmailError);
                }
              }
              console.log('✅ Processo invio notifiche completato');
            } else {
              console.log('⚠️ Nessun membro trovato nel gruppo per l\'invio email');
            }
          } catch (emailError) {
            console.error('❌ Errore generale invio email:', emailError);
          }
        });
      } else {
        console.log('📧 Nessun gruppo specificato - email non inviate');
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

      // Ottieni l'evento originale prima della modifica per confrontare le modifiche
      const originalEvent = await EventService.getEventById(id);
      if (!originalEvent) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role === 'ARTIST') {
        const userGroups = await GroupService.getUserGroups(req.user.userId);
        const userGroupIds = userGroups.map(ug => ug.id);
        
        if (originalEvent.group_id && !userGroupIds.includes(originalEvent.group_id)) {
          return res.status(403).json({ error: 'Access denied to this event' });
        }

        if (originalEvent.created_by !== req.user.userId) {
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

      // Invio notifiche email se il gruppo è specificato
      if (group_id || originalEvent.group_id) {
        // Invia email in background per non rallentare la risposta
        setImmediate(async () => {
          try {
            console.log('📧 Invio notifiche email per evento modificato...');
            
            const targetGroupId = group_id || originalEvent.group_id;
            
            // Ottieni i membri del gruppo per inviare le email
            const groupWithMembers = await GroupService.getGroupById(targetGroupId!);
            if (groupWithMembers && groupWithMembers.user_groups) {
              console.log(`📧 Invio email di modifica a ${groupWithMembers.user_groups.length} membri del gruppo ${groupWithMembers.name}`);
              
              // Importa la funzione di notifica modifica evento
              const { sendEventModificationNotification } = await import('../services/email.service');
              
              const memberEmails = groupWithMembers.user_groups.map(membership => membership.user.email);
              
              await sendEventModificationNotification({
                to: memberEmails,
                userName: 'Membri del gruppo',
                eventTitle: updatedEvent.title,
                eventDate: updatedEvent.date.toISOString(),
                groupName: groupWithMembers.name,
                modificationType: 'title', // Generalizzato per qualsiasi modifica
                oldValue: originalEvent.title,
                newValue: updatedEvent.title,
                adminName: req.user?.role === 'ADMIN' ? 'Admin' : 'Utente'
              });
              
              console.log('✅ Processo invio notifiche modifica evento completato');
            } else {
              console.log('⚠️ Nessun membro trovato nel gruppo per l\'invio email');
            }
          } catch (emailError) {
            console.error('❌ Errore generale invio email modifica evento:', emailError);
          }
        });
      } else {
        console.log('📧 Nessun gruppo specificato - email non inviate');
      }

      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  static async deleteEvent(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Ottieni l'evento prima di eliminarlo per inviare le notifiche email
      const eventToDelete = await EventService.getEventById(id);
      if (!eventToDelete) {
        return res.status(404).json({ error: 'Event not found' });
      }

      if (req.user?.role === 'ARTIST') {
        if (eventToDelete.created_by !== req.user.userId) {
          return res.status(403).json({ error: 'Only event creator or admin can delete events' });
        }
      }

      // Invio notifiche email se il gruppo è specificato
      if (eventToDelete.group_id) {
        // Invia email in background per non rallentare la risposta
        setImmediate(async () => {
          try {
            console.log('📧 Invio notifiche email per evento cancellato...');
            
            // Ottieni i membri del gruppo per inviare le email
            const groupWithMembers = await GroupService.getGroupById(eventToDelete.group_id!);
            if (groupWithMembers && groupWithMembers.user_groups) {
              console.log(`📧 Invio email di cancellazione a ${groupWithMembers.user_groups.length} membri del gruppo ${groupWithMembers.name}`);
              
              // Importa la funzione di notifica cancellazione evento
              const { sendEventDeletionNotification } = await import('../services/email.service');
              
              const memberEmails = groupWithMembers.user_groups.map(membership => membership.user.email);
              
              await sendEventDeletionNotification({
                to: memberEmails,
                userName: 'Membri del gruppo',
                eventTitle: eventToDelete.title,
                eventDate: typeof eventToDelete.date === 'string' ? eventToDelete.date : eventToDelete.date.toISOString(),
                eventTime: typeof eventToDelete.start_time === 'string' ? eventToDelete.start_time : eventToDelete.start_time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                venueName: eventToDelete.venue_name,
                groupName: groupWithMembers.name,
                deletionReason: 'Evento cancellato dall\'amministratore',
                adminName: req.user?.role === 'ADMIN' ? 'Admin' : 'Utente'
              });
              
              console.log('✅ Processo invio notifiche cancellazione evento completato');
            } else {
              console.log('⚠️ Nessun membro trovato nel gruppo per l\'invio email');
            }
          } catch (emailError) {
            console.error('❌ Errore generale invio email cancellazione evento:', emailError);
          }
        });
      } else {
        console.log('📧 Nessun gruppo specificato - email non inviate');
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