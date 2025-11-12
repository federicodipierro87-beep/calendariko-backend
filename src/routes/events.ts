import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { sendEventNotification } from '../services/email.service';

const router = express.Router();
const prisma = new PrismaClient();

// Debug endpoints - messi all'inizio per evitare conflitti
router.get('/debug/ping', (req, res) => res.json({ message: 'Debug endpoint works!', timestamp: new Date() }));

router.post('/debug/test-email/:eventId', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 TEST EMAIL MODIFICATION CALLED');
    const { eventId } = req.params;
    
    // Ottieni l'evento per il test
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        group: {
          include: {
            user_groups: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });
    
    if (!event || !event.group_id) {
      return res.status(404).json({ error: 'Event not found or no group' });
    }

    console.log('🔍 TEST - Event found:', event.title, 'Group:', event.group_id);

    // Test invio email
    setTimeout(async () => {
      try {
        console.log('📧 TEST - Invio notifiche email per evento modificato...');
        
        if (event.group && event.group.user_groups) {
          console.log(`📧 TEST - Invio email a ${event.group.user_groups.length} membri del gruppo ${event.group.name}`);
          
          for (const membership of event.group.user_groups) {
            try {
              await sendEventNotification({
                to: membership.user.email,
                userName: `${membership.user.first_name} ${membership.user.last_name}`,
                eventTitle: `[TEST MODIFICATO] ${event.title}`,
                eventDate: event.date.toLocaleDateString('it-IT'),
                eventTime: event.start_time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                venueName: event.venue_name,
                venueCity: event.venue_city || 'Milano',
                groupName: event.group!.name,
                creatorName: 'Admin',
                notes: 'QUESTO È UN TEST DI MODIFICA EVENTO'
              });
              console.log(`✅ TEST - Email inviata a ${membership.user.email}`);
            } catch (memberEmailError) {
              console.error(`❌ TEST - Errore invio email a ${membership.user.email}:`, memberEmailError);
            }
          }
          console.log('✅ TEST - Processo invio notifiche completato');
        } else {
          console.log('⚠️ TEST - Nessun membro trovato nel gruppo per l\'invio email');
        }
      } catch (emailError) {
        console.error('❌ TEST - Errore generale invio email:', emailError);
      }
    }, 100);

    res.json({ message: 'Test email modification triggered' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// GET /api/events - Ottieni eventi (tutti per admin, solo del gruppo per utenti)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    
    // Ottieni informazioni sull'utente corrente
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_groups: {
          include: {
            group: true
          }
        }
      }
    });

    if (!currentUser) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    let events;

    if (currentUser.role === 'ADMIN') {
      // Admin vede tutti gli eventi
      events = await prisma.event.findMany({
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
                      role: true
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
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
    } else {
      // Utenti normali vedono solo eventi dei loro gruppi
      const userGroupIds = currentUser.user_groups.map(ug => ug.group_id);
      
      events = await prisma.event.findMany({
        where: {
          group_id: {
            in: userGroupIds
          }
        },
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
                      role: true
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
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      });
    }

    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Errore nel recupero degli eventi' });
  }
});

// POST /api/events - Crea nuovo evento
router.post('/', authenticateToken, async (req, res) => {
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
      notes
    } = req.body;

    const userId = (req as any).user.userId;

    // Verifica che solo gli admin possano creare eventi
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (user?.role !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Solo gli amministratori possono creare eventi' 
      });
    }

    // Validazione campi obbligatori
    if (!title || !date || !start_time || !end_time || !venue_name || !venue_city) {
      return res.status(400).json({ 
        error: 'Titolo, data, orario di inizio, orario di fine, venue e città sono obbligatori' 
      });
    }

    // Se è specificato un gruppo, verifica che esista
    let group = null;
    if (group_id) {
      group = await prisma.group.findUnique({
        where: { id: group_id },
        include: {
          user_groups: {
            include: {
              user: {
                select: {
                  id: true,
                  first_name: true,
                  last_name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      });

      if (!group) {
        return res.status(404).json({ error: 'Gruppo non trovato' });
      }
    }

    // Crea l'evento
    const event = await prisma.event.create({
      data: {
        title,
        event_type,
        date: new Date(date),
        start_time: new Date(`${date}T${start_time}`),
        end_time: new Date(`${date}T${end_time}`),
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee: fee ? parseFloat(fee) : null,
        notes,
        status: 'PROPOSED',
        created_by: userId
      },
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
                    role: true
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
            email: true,
            role: true
          }
        }
      }
    });

    // Invia notifiche email ai membri del gruppo
    if (group && group.user_groups.length > 0) {
      try {
        const promises = group.user_groups.map(async (userGroup) => {
          const user = userGroup.user;
          // Non inviare notifica al creatore dell'evento
          if (user.id !== userId) {
            await sendEventNotification({
              to: user.email,
              userName: `${user.first_name} ${user.last_name}`,
              eventTitle: title,
              eventDate: date,
              eventTime: start_time,
              venueName: venue_name,
              venueCity: venue_city,
              groupName: group.name,
              creatorName: `${event.creator.first_name} ${event.creator.last_name}`,
              notes: notes || ''
            });
          }
        });

        await Promise.all(promises);
        console.log(`Notifiche inviate per l'evento: ${title}`);
      } catch (emailError) {
        console.error('Errore nell\'invio delle notifiche email:', emailError);
        // Non fallire la creazione dell'evento se l'email fallisce
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Errore nella creazione dell\'evento' });
  }
});

// GET /api/events/:id - Ottieni dettagli evento specifico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const event = await prisma.event.findUnique({
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
                    role: true
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
            email: true,
            role: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Errore nel recupero dell\'evento' });
  }
});

// PUT /api/events/:id - Aggiorna evento
router.put('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 updateEvent CALLED with ID:', req.params.id);
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

    const userId = (req as any).user.userId;

    // Verifica che l'evento esista
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: true,
        group: true
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    // Verifica permessi (solo il creatore o admin possono modificare)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingEvent.created_by !== userId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non hai i permessi per modificare questo evento' });
    }

    // Aggiorna l'evento
    const event = await prisma.event.update({
      where: { id },
      data: {
        title,
        event_type,
        date: date ? new Date(date) : undefined,
        start_time: start_time && date ? new Date(`${date}T${start_time}`) : undefined,
        end_time: end_time && date ? new Date(`${date}T${end_time}`) : undefined,
        venue_name,
        venue_address,
        venue_city,
        group_id,
        fee: fee ? parseFloat(fee) : null,
        status,
        notes
      },
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
                    role: true
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
            email: true,
            role: true
          }
        }
      }
    });

    // Rispondi al client prima di inviare email
    res.json(event);

    // Invia email di modifica ai membri del gruppo (in background)
    if (group_id || existingEvent.group_id) {
      console.log('📧 Sending modification emails post-response');
      setTimeout(async () => {
        try {
          const groupWithMembers = await prisma.group.findUnique({
            where: { id: group_id || existingEvent.group_id! },
            include: {
              user_groups: {
                include: {
                  user: true
                }
              }
            }
          });
          
          if (groupWithMembers && groupWithMembers.user_groups) {
            for (const membership of groupWithMembers.user_groups) {
              try {
                await sendEventNotification({
                  to: membership.user.email,
                  userName: `${membership.user.first_name} ${membership.user.last_name}`,
                  eventTitle: `[MODIFICATO] ${event.title}`,
                  eventDate: event.date.toLocaleDateString('it-IT'),
                  eventTime: event.start_time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                  venueName: event.venue_name,
                  venueCity: event.venue_city || 'Milano',
                  groupName: groupWithMembers.name,
                  creatorName: 'Admin',
                  notes: `Evento modificato dall'amministratore. ${event.notes || 'Nessuna nota aggiuntiva'}`
                });
                console.log(`✅ Modification email sent to ${membership.user.email}`);
              } catch (error) {
                console.error('❌ Email error:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Group fetch error:', error);
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'evento' });
  }
});

// DELETE /api/events/:id - Elimina evento
router.delete('/:id', authenticateToken, async (req, res) => {
  console.log('🔍 deleteEvent CALLED with ID:', req.params.id);
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Verifica che l'evento esista e ottieni dati per email
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: {
        creator: true,
        group: {
          include: {
            user_groups: {
              include: {
                user: true
              }
            }
          }
        }
      }
    });

    if (!existingEvent) {
      return res.status(404).json({ error: 'Evento non trovato' });
    }

    // Verifica permessi (solo il creatore o admin possono eliminare)
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (existingEvent.created_by !== userId && user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Non hai i permessi per eliminare questo evento' });
    }

    // Elimina l'evento
    await prisma.event.delete({
      where: { id }
    });

    res.json({ message: 'Evento eliminato con successo' });

    // Invia email di cancellazione ai membri del gruppo (in background)
    if (existingEvent.group_id && existingEvent.group) {
      console.log('📧 Sending deletion emails post-response');
      setTimeout(async () => {
        try {
          if (existingEvent.group && existingEvent.group.user_groups) {
            for (const membership of existingEvent.group.user_groups) {
              try {
                await sendEventNotification({
                  to: membership.user.email,
                  userName: `${membership.user.first_name} ${membership.user.last_name}`,
                  eventTitle: `[CANCELLATO] ${existingEvent.title}`,
                  eventDate: existingEvent.date.toLocaleDateString('it-IT'),
                  eventTime: existingEvent.start_time.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
                  venueName: existingEvent.venue_name,
                  venueCity: existingEvent.venue_city || 'Milano',
                  groupName: existingEvent.group!.name,
                  creatorName: 'Admin',
                  notes: 'ATTENZIONE: Questo evento è stato cancellato dall\'amministratore.'
                });
                console.log(`✅ Deletion email sent to ${membership.user.email}`);
              } catch (error) {
                console.error('❌ Email error:', error);
              }
            }
          }
        } catch (error) {
          console.error('❌ Group fetch error:', error);
        }
      }, 100);
    }
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione dell\'evento' });
  }
});

export default router;