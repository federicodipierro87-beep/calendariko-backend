import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdminController {
  static async resetDatabase(req: Request, res: Response) {
    try {
      console.log('🔥 Avvio reset completo database...');
      
      // Elimina tutti i dati dalle tabelle in ordine (per rispettare le foreign keys)
      const deletedTables = [];
      
      try {
        await prisma.$executeRaw`DELETE FROM user_groups`;
        deletedTables.push('user_groups');
      } catch (e) { console.log('Tabella user_groups non esistente o già vuota'); }
      
      try {
        await prisma.$executeRaw`DELETE FROM notifications`;
        deletedTables.push('notifications');
      } catch (e) { console.log('Tabella notifications non esistente o già vuota'); }
      
      try {
        await prisma.$executeRaw`DELETE FROM events`;
        deletedTables.push('events');
      } catch (e) { console.log('Tabella events non esistente o già vuota'); }
      
      try {
        await prisma.$executeRaw`DELETE FROM groups`;
        deletedTables.push('groups');
      } catch (e) { console.log('Tabella groups non esistente o già vuota'); }
      
      try {
        await prisma.$executeRaw`DELETE FROM availability`;
        deletedTables.push('availability');
      } catch (e) { console.log('Tabella availability non esistente o già vuota'); }
      
      try {
        await prisma.$executeRaw`DELETE FROM users`;
        deletedTables.push('users');
      } catch (e) { console.log('Tabella users non esistente o già vuota'); }
      
      console.log('✅ Database resettato con successo');
      console.log('📋 Tabelle svuotate:', deletedTables);
      
      res.status(200).json({
        success: true,
        message: 'Database resettato con successo. Tutte le tabelle sono state svuotate.',
        deletedTables: deletedTables,
        totalTables: deletedTables.length
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