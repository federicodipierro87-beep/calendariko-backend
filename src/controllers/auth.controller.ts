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

      // Verifica se l'email è stata confermata (gli admin bypassano la verifica)
      if (!result.user.emailVerified && result.user.role !== 'ADMIN') {
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
  static async verifyEmailRedirect(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const frontendUrl = process.env.FRONTEND_URL || 'https://calendariko.netlify.app';
      
      if (!token) {
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Errore Verifica - Calendariko</title>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
              .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              h1 { color: #dc2626; }
              a { color: #4f46e5; text-decoration: none; font-weight: bold; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Errore</h1>
              <p>Token di verifica mancante</p>
              <a href="${frontendUrl}">Torna al Login</a>
            </div>
          </body>
          </html>
        `);
      }

      const result = await AuthService.verifyEmail(token);
      
      // Se arriviamo qui, la verifica è andata a buon fine
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verificata - Calendariko</title>
          <meta charset="utf-8">
          <meta http-equiv="refresh" content="5;url=${frontendUrl}">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #16a34a; }
            a { color: #4f46e5; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
            .countdown { font-weight: bold; color: #16a34a; }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
            .pulse { animation: pulse 1s infinite; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅ Email Verificata!</h1>
            <p>La tua email è stata verificata con successo!</p>
            <p class="pulse">Verrai reindirizzato al login tra <span class="countdown">5</span> secondi...</p>
            <p><a href="${frontendUrl}">Vai subito al Login</a></p>
          </div>
        </body>
        </html>
      `);
    } catch (error: any) {
      const frontendUrl = process.env.FRONTEND_URL || 'https://calendariko.netlify.app';
      console.error('❌ Errore verifica email:', error);
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Errore Verifica - Calendariko</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
            .container { max-width: 500px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #dc2626; }
            a { color: #4f46e5; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Verifica Fallita</h1>
            <p>${error.message || 'Token di verifica non valido o scaduto'}</p>
            <a href="${frontendUrl}">Torna al Login</a>
          </div>
        </body>
        </html>
      `);
    }
  }

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