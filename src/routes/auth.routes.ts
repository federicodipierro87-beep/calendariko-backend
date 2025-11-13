import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/refresh', AuthController.refresh);
router.post('/register', authenticateToken, requireAdmin, AuthController.register);
router.post('/public-register', AuthController.publicRegister);
router.post('/create-first-admin', AuthController.createFirstAdmin);
router.get('/public-groups', AuthController.getPublicGroups);

// ENDPOINT TEMPORANEO PER MIGRATION - DA RIMUOVERE DOPO L'USO
router.post('/admin-migrate', async (req, res) => {
  try {
    console.log('🔧 ADMIN MIGRATION - Applying security fields...');
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    // Applica le colonne di sicurezza
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "failed_login_attempts" INTEGER DEFAULT 0;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "account_locked" BOOLEAN DEFAULT false;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP;
    `;
    await prisma.$executeRaw`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_failed_attempt" TIMESTAMP;
    `;
    
    console.log('✅ ADMIN MIGRATION - Security fields applied successfully');
    
    await prisma.$disconnect();
    
    res.json({ 
      success: true, 
      message: 'Security fields added to database successfully!' 
    });
    
  } catch (error: any) {
    console.error('❌ ADMIN MIGRATION ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ENDPOINT TEMPORANEO PER VERIFICARE UTENTE
router.get('/check-user/:email', async (req, res) => {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const user = await prisma.user.findUnique({
      where: { email: req.params.email },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        failed_login_attempts: true,
        account_locked: true,
        created_at: true
      }
    });
    
    await prisma.$disconnect();
    
    res.json({ 
      exists: !!user,
      user: user || null
    });
    
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;