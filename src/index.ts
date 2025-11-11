import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import groupRoutes from './routes/group.routes';
import eventRoutes from './routes/events';
import availabilityRoutes from './routes/availability.routes';
import emailRoutes from './routes/email.routes';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();


app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://zingy-hamster-f25654.netlify.app',
    /https:\/\/.*\.netlify\.app$/
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', async (req, res) => {
  console.log('🔍 HEALTH - Query params ricevuti:', req.query);
  if (req.query.groups === 'true') {
    console.log('🔍 HEALTH GROUPS - richiesta gruppi via health endpoint!');
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

      console.log('🔍 HEALTH GROUPS - Gruppi trovati:', groups.length);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching groups via health:', error);
      res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
    }
  } else {
    console.log('🔍 HEALTH - Risposta normale');
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/email', emailRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test configurazione email all'avvio
  console.log('📧 [STARTUP] Test configurazione Resend...');
  console.log('📧 [STARTUP] RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'configurato' : 'usando fallback embedded');
  console.log('📧 [STARTUP] Provider: Resend (rimosso SMTP per compatibilità Railway)');
});