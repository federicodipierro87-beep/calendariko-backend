import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/public/groups - Ottieni tutti i gruppi (pubblico per registrazione)
router.get('/groups', async (req, res) => {
  console.log('🔍 PUBLIC - /groups route raggiunta!');
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

    console.log('🔍 PUBLIC - Gruppi trovati:', groups.length);
    res.json(groups);
  } catch (error) {
    console.error('Error fetching public groups:', error);
    res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  console.log('🔍 PUBLIC - /test route raggiunta!');
  res.json({ message: 'Public test route funziona!', timestamp: new Date().toISOString() });
});

export default router;