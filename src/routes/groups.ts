import express, { Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint senza autenticazione
router.get('/test', (req, res) => {
  console.log('🔍 TEST - /test route raggiunta!');
  res.json({ message: 'Test route funziona!' });
});

// GET /api/groups/public - Ottieni tutti i gruppi (pubblico per registrazione)
router.get('/public', async (req, res) => {
  console.log('🔍 PUBBLICO - /public route raggiunta!');
  try {
    const groups = await prisma.group.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        genre: true,
        description: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching public groups:', error);
    res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
  }
});

// GET /api/groups - Ottieni tutti i gruppi
router.get('/', authenticateToken, async (req, res) => {
  try {
    const groups = await prisma.group.findMany({
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
        },
        _count: {
          select: { events: true }
        }
      }
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
  }
});

// POST /api/groups - Crea nuovo gruppo
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, description, genre, contact_email, contact_phone } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Nome e tipo sono obbligatori' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        type,
        description,
        genre,
        contact_email,
        contact_phone
      },
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

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Errore nella creazione del gruppo' });
  }
});

// GET /api/groups/:id - Ottieni dettagli gruppo specifico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
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
        },
        events: {
          include: {
            creator: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Errore nel recupero del gruppo' });
  }
});

// POST /api/groups/:id/members - Aggiungi membro al gruppo
router.post('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID è obbligatorio' });
    }

    // Verifica che il gruppo esista
    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato' });
    }

    // Verifica che l'utente esista
    const user = await prisma.user.findUnique({
      where: { id: user_id }
    });

    if (!user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Verifica che l'utente non sia già nel gruppo
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        user_id,
        group_id: id
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'L\'utente è già membro del gruppo' });
    }

    // Aggiungi l'utente al gruppo
    const membership = await prisma.userGroup.create({
      data: {
        user_id,
        group_id: id
      },
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
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error adding group member:', error);
    res.status(500).json({ error: 'Errore nell\'aggiunta del membro al gruppo' });
  }
});

// DELETE /api/groups/:id/members/:userId - Rimuovi membro dal gruppo
router.delete('/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Verifica che il gruppo esista
    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato' });
    }

    // Verifica che l'utente sia nel gruppo
    const membership = await prisma.userGroup.findFirst({
      where: {
        user_id: userId,
        group_id: id
      }
    });

    if (!membership) {
      return res.status(400).json({ error: 'L\'utente non è membro del gruppo' });
    }

    // Rimuovi l'utente dal gruppo
    await prisma.userGroup.delete({
      where: { id: membership.id }
    });

    res.json({ message: 'Membro rimosso con successo' });
  } catch (error) {
    console.error('Error removing group member:', error);
    res.status(500).json({ error: 'Errore nella rimozione del membro dal gruppo' });
  }
});

// POST /api/groups/:id/join - L'utente si unisce al gruppo
router.post('/:id/join', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }

    // Verifica che il gruppo esista
    const group = await prisma.group.findUnique({
      where: { id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Gruppo non trovato' });
    }

    // Verifica che l'utente non sia già nel gruppo
    const existingMembership = await prisma.userGroup.findFirst({
      where: {
        user_id: userId,
        group_id: id
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: 'Sei già membro del gruppo' });
    }

    // Aggiungi l'utente al gruppo
    const membership = await prisma.userGroup.create({
      data: {
        user_id: userId,
        group_id: id
      },
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
    });

    res.status(201).json(membership);
  } catch (error) {
    console.error('Error joining group:', error);
    res.status(500).json({ error: 'Errore nell\'unirsi al gruppo' });
  }
});

// DELETE /api/groups/:id/leave - L'utente lascia il gruppo
router.delete('/:id/leave', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Utente non autenticato' });
    }

    // Verifica che l'utente sia nel gruppo
    const membership = await prisma.userGroup.findFirst({
      where: {
        user_id: userId,
        group_id: id
      }
    });

    if (!membership) {
      return res.status(400).json({ error: 'Non sei membro del gruppo' });
    }

    // Rimuovi l'utente dal gruppo
    await prisma.userGroup.delete({
      where: { id: membership.id }
    });

    res.json({ message: 'Hai lasciato il gruppo con successo' });
  } catch (error) {
    console.error('Error leaving group:', error);
    res.status(500).json({ error: 'Errore nel lasciare il gruppo' });
  }
});

export default router;