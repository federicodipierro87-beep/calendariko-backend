import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Endpoint per applicare migrazioni manualmente (solo per admin)
router.post('/apply-schema', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Controlla se la tabella notifications esiste già
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      );
    `;

    if (!(tableExists as any[])[0].exists) {
      // Applica le modifiche al database
      await prisma.$executeRaw`
        CREATE TYPE "NotificationType" AS ENUM ('NEW_USER_REGISTRATION', 'ACCOUNT_ACTIVATION', 'SYSTEM_ALERT');
      `;
      
      await prisma.$executeRaw`
        CREATE TABLE "notifications" (
          "id" TEXT NOT NULL,
          "type" "NotificationType" NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "user_id" TEXT,
          "is_read" BOOLEAN NOT NULL DEFAULT false,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "data" JSONB,

          CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
        );
      `;

      await prisma.$executeRaw`
        ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" 
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `;

      res.json({ 
        message: 'Schema applicato con successo! La tabella notifications è stata creata.',
        applied: true
      });
    } else {
      res.json({ 
        message: 'Schema già aggiornato. La tabella notifications esiste già.',
        applied: false
      });
    }
  } catch (error) {
    console.error('Error applying schema:', error);
    res.status(500).json({ error: 'Errore nell\'applicazione dello schema: ' + (error as Error).message });
  }
});

export default router;