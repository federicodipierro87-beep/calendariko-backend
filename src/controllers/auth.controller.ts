import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { EmailService } from '../services/email.service';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const result = await AuthService.login(email, password);

      // Verifica se l'email è stata confermata
      if (!result.user.emailVerified) {
        return res.status(400).json({ 
          error: 'Email non verificata. Controlla la tua casella di posta e clicca sul link di verifica.',
          code: 'EMAIL_NOT_VERIFIED'
        });
      }
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Genera token di verifica
      const verificationToken = Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

      const result = await AuthService.register({
        email,
        password,
        firstName: firstName || 'User',
        lastName: lastName || 'Default',
        role,
        verificationToken,
        verificationTokenExpiresAt
      });

      // Invia email di verifica
      try {
        await EmailService.sendVerificationEmail(email, result.user.firstName, verificationToken);
        console.log('✅ Email di verifica inviata a:', email);
      } catch (emailError: any) {
        console.error('❌ Errore invio email verifica:', emailError);
        // Non bloccare la registrazione se l'email non può essere inviata
      }

      res.status(201).json({
        success: true,
        message: 'Registrazione completata! Controlla la tua email per verificare l\'account.',
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role,
          emailVerified: result.user.emailVerified
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies;

      if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token not found' });
      }

      const tokens = await AuthService.refreshToken(refreshToken);

      // Set new refresh token as HTTP-only cookie
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      res.json({
        success: true,
        accessToken: tokens.accessToken
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      // Clear refresh token cookie
      res.clearCookie('refreshToken');
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Email verification endpoints
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ 
          success: false,
          error: 'Token di verifica richiesto' 
        });
      }

      const result = await AuthService.verifyEmail(token);

      res.json({
        success: true,
        message: 'Email verificata con successo! Ora puoi accedere al tuo account.',
        user: result.user
      });
    } catch (error: any) {
      console.error('❌ Errore verifica email:', error);
      
      if (error.message.includes('expired')) {
        return res.status(400).json({ 
          success: false,
          error: 'Il link di verifica è scaduto. Richiedi un nuovo link.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      res.status(400).json({ 
        success: false,
        error: error.message || 'Token di verifica non valido'
      });
    }
  }

  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email richiesta' });
      }

      // Genera nuovo token
      const verificationToken = Math.random().toString(36).substr(2, 15) + Math.random().toString(36).substr(2, 15);
      const verificationTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore

      const result = await AuthService.updateVerificationToken(email, verificationToken, verificationTokenExpiresAt);

      // Invia nuova email di verifica
      await EmailService.sendVerificationEmail(email, result.user.firstName, verificationToken);

      res.json({
        success: true,
        message: 'Nuovo link di verifica inviato! Controlla la tua email.'
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  // Temporary endpoint to create first admin user for testing
  static async createFirstAdmin(req: Request, res: Response) {
    try {
      const result = await AuthService.register({
        email: 'admin@calendariko.com',
        password: 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        emailVerified: true // Admin bypassa la verifica email
      });

      res.status(201).json({
        success: true,
        message: 'First admin user created',
        user: result.user
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}