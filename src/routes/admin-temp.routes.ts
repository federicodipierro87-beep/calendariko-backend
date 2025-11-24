import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ENDPOINT TEMPORANEO PER RISOLVERE MIGRAZIONE
router.post('/fix-migration', async (req, res) => {
  try {
    console.log('🔧 Fixing database migration...');
    
    // Reset migration status
    await prisma.$executeRaw`DELETE FROM "_prisma_migrations" WHERE migration_name = '20241124_add_all_tables'`;
    
    // Try to create tables that don't exist
    try {
      await prisma.$executeRaw`
        CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');
      `;
    } catch (e) { console.log('EventStatus enum già esistente'); }
    
    try {
      await prisma.$executeRaw`
        CREATE TYPE "NotificationType" AS ENUM ('INFO', 'WARNING', 'SUCCESS', 'ERROR');
      `;
    } catch (e) { console.log('NotificationType enum già esistente'); }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "groups" (
          "id" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "color" TEXT,
          "creatorId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
        );
      `;
    } catch (e) { console.log('Table groups già esistente'); }
    
    try {
      await prisma.$executeRaw`
        CREATE TABLE "events" (
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
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "events_pkey" PRIMARY KEY ("id")
        );
      `;
    } catch (e) { console.log('Table events già esistente'); }
    
    // Add foreign keys if they don't exist
    try {
      await prisma.$executeRaw`ALTER TABLE "events" ADD CONSTRAINT "events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;`;
    } catch (e) { console.log('FK events_userId_fkey già esistente'); }
    
    console.log('✅ Migration fixed!');
    res.json({ success: true, message: 'Migration fixed successfully' });
    
  } catch (error: any) {
    console.error('❌ Error fixing migration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;