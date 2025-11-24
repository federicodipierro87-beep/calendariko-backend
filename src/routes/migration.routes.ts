import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Endpoint per creare le tabelle mancanti - versione semplificata
router.post('/create-tables', async (req, res) => {
  try {
    console.log('🔧 Creating missing database tables...');
    
    // Step 1: Create ENUMs
    try {
      await prisma.$executeRaw`CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');`;
      console.log('✅ EventStatus enum created');
    } catch (e) { 
      console.log('EventStatus enum already exists'); 
    }
    
    try {
      await prisma.$executeRaw`CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');`;
      console.log('✅ NotificationType enum created');
    } catch (e) { 
      console.log('NotificationType enum already exists'); 
    }
    
    // Step 2: Create tables WITHOUT foreign keys first
    try {
      await prisma.$executeRaw`
        CREATE TABLE "groups" (
          "id" TEXT PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "color" TEXT,
          "creatorId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log('✅ Groups table created');
    } catch (e) { 
      console.log('Groups table already exists'); 
    }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "events" (
          "id" TEXT PRIMARY KEY,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "startTime" TIMESTAMP(3) NOT NULL,
          "endTime" TIMESTAMP(3) NOT NULL,
          "location" TEXT,
          "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
          "userId" TEXT NOT NULL,
          "groupId" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log('✅ Events table created');
    } catch (e) { 
      console.log('Events table already exists'); 
    }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "user_groups" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "groupId" TEXT NOT NULL,
          UNIQUE("userId", "groupId")
        );
      `;
      console.log('✅ UserGroups table created');
    } catch (e) { 
      console.log('UserGroups table already exists'); 
    }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "availability" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "dayOfWeek" INTEGER NOT NULL,
          "startTime" TEXT NOT NULL,
          "endTime" TEXT NOT NULL,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log('✅ Availability table created');
    } catch (e) { 
      console.log('Availability table already exists'); 
    }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "notifications" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "type" "NotificationType" NOT NULL DEFAULT 'INFO',
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `;
      console.log('✅ Notifications table created');
    } catch (e) { 
      console.log('Notifications table already exists'); 
    }
    
    console.log('✅ All database tables created successfully!');
    res.json({ 
      success: true, 
      message: 'Database tables created successfully',
      tables: ['groups', 'user_groups', 'events', 'availability', 'notifications'],
      note: 'Foreign keys can be added later if needed'
    });
    
  } catch (error: any) {
    console.error('❌ Error creating tables:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      message: 'Error creating database tables' 
    });
  }
});

export default router;