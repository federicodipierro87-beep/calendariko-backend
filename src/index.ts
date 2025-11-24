import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - simplified
app.use(cors({
  origin: true, // Allow all origins temporarily for debugging
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With']
}));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
import authRoutes from './routes/auth.routes';
import eventRoutes from './routes/event.routes';
import groupRoutes from './routes/group.routes';
import userRoutes from './routes/user.routes';
import availabilityRoutes from './routes/availability.routes';
import notificationRoutes from './routes/notification.routes';
import migrationRoutes from './routes/migration.routes';

// API routes
app.get('/api', (req, res) => {
  res.json({ message: 'Calendariko Backend API' });
});

// Test endpoint for schema sync (no auth required)
app.get('/api/test-schema', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const groupCount = await prisma.group.count();
    const eventCount = await prisma.event.count();
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      message: 'Schema is working',
      counts: { groups: groupCount, events: eventCount }
    });
  } catch (error: any) {
    res.json({
      success: false,
      message: 'Schema not synced',
      error: error.message
    });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// Event routes
app.use('/api/events', eventRoutes);

// Group routes
app.use('/api/groups', groupRoutes);

// User routes
app.use('/api/users', userRoutes);

// Availability routes
app.use('/api/availability', availabilityRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Migration routes (TEMPORARY)
app.use('/api/migration', migrationRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - handled by default Express behavior

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Auto-sync Prisma schema on startup
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    console.log('🔄 Auto-syncing Prisma schema...');
    const groupCount = await prisma.group.count();
    console.log(`✅ Prisma schema sync successful - Groups: ${groupCount}`);
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.log('⚠️ Prisma schema not yet synced:', error.message);
    console.log('📝 Tables may need to be created first');
  }
});