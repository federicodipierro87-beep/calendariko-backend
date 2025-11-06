import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { PrismaClient } from '@prisma/client';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.login(email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const tokens = await AuthService.refreshToken(refreshToken);
      res.json(tokens);
    } catch (error) {
      res.status(401).json({ error: (error as Error).message });
    }
  }

  static async logout(req: Request, res: Response) {
    res.json({ message: 'Logged out successfully' });
  }

  static async register(req: Request, res: Response) {
    console.log('🚀 === REGISTER CONTROLLER CHIAMATO === 🚀');
    console.log('Body ricevuto:', JSON.stringify(req.body, null, 2));
    try {
      const { email, password, first_name, last_name, phone, role } = req.body;

      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'Required fields missing' });
      }

      const user = await AuthService.createUser({
        email,
        password,
        first_name,
        last_name,
        phone,
        role
      });

      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async publicRegister(req: Request, res: Response) {
    try {
      const { email, password, first_name, last_name, phone, selectedGroup } = req.body;

      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'Email, password, nome e cognome sono obbligatori' });
      }

      if (!selectedGroup) {
        return res.status(400).json({ error: 'Gruppo di appartenenza è obbligatorio' });
      }

      // Registrazione pubblica: sempre con ruolo ARTIST
      const user = await AuthService.createUser({
        email,
        password,
        first_name,
        last_name,
        phone,
        role: 'ARTIST',
        selectedGroups: [selectedGroup]
      });

      res.status(201).json({ 
        message: 'Registrazione completata con successo! Ora puoi effettuare il login.',
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async createFirstAdmin(req: Request, res: Response) {
    try {
      // Controlla se esiste già un admin
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      const existingAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });

      if (existingAdmin) {
        return res.status(400).json({ error: 'Admin user already exists' });
      }

      const user = await AuthService.createUser({
        email: 'admin@calendariko.com',
        password: 'admin123',
        first_name: 'Admin',
        last_name: 'User',
        role: 'ADMIN'
      });

      res.status(201).json({ message: 'First admin created successfully', user });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }

  static async getPublicGroups(req: Request, res: Response) {
    console.log('🔍 AUTH CONTROLLER - getPublicGroups chiamato!');
    try {
      const prisma = new PrismaClient();
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

      console.log('🔍 AUTH CONTROLLER - Gruppi trovati:', groups.length);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching public groups:', error);
      res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
    }
  }
}