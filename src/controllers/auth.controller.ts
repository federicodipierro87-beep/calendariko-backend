import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { GroupService } from '../services/group.service';
import { PrismaClient } from '@prisma/client';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password, recaptchaToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.login(email, password, recaptchaToken);
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
      const { email, password, first_name, last_name, phone, recaptchaToken } = req.body;

      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ error: 'Email, password, nome e cognome sono obbligatori' });
      }

      if (!recaptchaToken) {
        return res.status(400).json({ error: 'Verifica reCAPTCHA richiesta' });
      }

      // Registrazione pubblica: sempre con ruolo ARTIST, senza gruppo assegnato
      const user = await AuthService.createUser({
        email,
        password,
        first_name,
        last_name,
        phone,
        role: 'ARTIST'
      });

      res.status(201).json({ 
        message: 'Registrazione completata con successo! Un amministratore ti assegnerà al gruppo appropriato e riceverai una notifica via email.',
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
      const groups = await GroupService.getPublicGroups();
      console.log('🔍 AUTH CONTROLLER - Gruppi trovati:', groups.length);
      res.json(groups);
    } catch (error) {
      console.error('Error fetching public groups:', error);
      res.status(500).json({ error: 'Errore nel recupero dei gruppi' });
    }
  }
}