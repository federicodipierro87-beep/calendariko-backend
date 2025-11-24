import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminController {
  static async resetDatabase(req: Request, res: Response) {
    try {
      console.log('🔥 Avvio reset database...');
      
      // Elimina tutti i dati dalle tabelle esistenti
      await prisma.user.deleteMany({});
      
      console.log('✅ Database resettato con successo');
      
      res.status(200).json({
        success: true,
        message: 'Database resettato con successo. Tutti i dati sono stati eliminati.'
      });
      
    } catch (error) {
      console.error('❌ Errore nel reset del database:', error);
      res.status(500).json({
        success: false,
        message: 'Errore nel reset del database',
        error: process.env.NODE_ENV === 'development' ? error : 'Errore interno'
      });
    }
  }
}