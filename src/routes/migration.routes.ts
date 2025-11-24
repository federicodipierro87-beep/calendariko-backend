import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Endpoint per creare le tabelle mancanti
router.post('/create-tables', async (req, res) => {
  try {
    console.log('🔧 Creating missing database tables...');
    
    // Create ENUMs first
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    // Create tables if they don't exist
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "color" TEXT,
        "creatorId" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "user_groups" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "groupId" TEXT NOT NULL,
        CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT,
        "startTime" TIMESTAMP(3) NOT NULL,
        "endTime" TIMESTAMP(3) NOT NULL,
        "location" TEXT,
        "status" "EventStatus" NOT NULL DEFAULT 'PENDING',
        "userId" TEXT NOT NULL,
        "groupId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "events_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "availability" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "dayOfWeek" INTEGER NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "type" "NotificationType" NOT NULL DEFAULT 'INFO',
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create indexes and constraints
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE UNIQUE INDEX "user_groups_userId_groupId_key" ON "user_groups"("userId", "groupId");
      EXCEPTION
        WHEN duplicate_table THEN null;
      END $$;
    `;
    
    // Create foreign keys
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "groups" ADD CONSTRAINT "groups_creatorId_fkey" 
        FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_groupId_fkey" 
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "events" ADD CONSTRAINT "events_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "events" ADD CONSTRAINT "events_groupId_fkey" 
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "availability" ADD CONSTRAINT "availability_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ BEGIN
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    console.log('✅ Database tables created successfully!');
    res.json({ 
      success: true, 
      message: 'Database tables created successfully',
      tables: ['groups', 'user_groups', 'events', 'availability', 'notifications']
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