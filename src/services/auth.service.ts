import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { sendWelcomeEmail } from './email.service';
import { NotificationService } from './notification.service';
import axios from 'axios';

const prisma = new PrismaClient();

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || 'your-secret-key';
const MAX_LOGIN_ATTEMPTS = 5;
const REQUIRE_RECAPTCHA_AFTER = 3;

export class AuthService {
  static async verifyRecaptcha(token: string): Promise<boolean> {
    try {
      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token
        }
      });
      return response.data.success;
    } catch (error) {
      console.error('Errore verifica reCAPTCHA:', error);
      return false;
    }
  }

  static async login(email: string, password: string, recaptchaToken?: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Credenziali non valide');
    }

    // Controlla se l'account è bloccato
    if (user.account_locked) {
      throw new Error('Account disabilitato dopo troppi tentativi falliti. Contatta un amministratore per la riattivazione.');
    }

    // Verifica se serve reCAPTCHA (dopo 3 tentativi falliti)
    if (user.failed_login_attempts >= REQUIRE_RECAPTCHA_AFTER) {
      if (!recaptchaToken) {
        throw new Error('Verifica reCAPTCHA richiesta a causa di tentativi di accesso falliti.');
      }

      const isRecaptchaValid = await this.verifyRecaptcha(recaptchaToken);
      if (!isRecaptchaValid) {
        throw new Error('Verifica reCAPTCHA fallita. Riprova.');
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      // Incrementa il contatore dei tentativi falliti
      const newFailedAttempts = user.failed_login_attempts + 1;
      
      // Blocca l'account se raggiunge il limite massimo
      const shouldLockAccount = newFailedAttempts >= MAX_LOGIN_ATTEMPTS;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: newFailedAttempts,
          last_failed_attempt: new Date(),
          account_locked: shouldLockAccount,
          locked_at: shouldLockAccount ? new Date() : null
        }
      });

      if (shouldLockAccount) {
        throw new Error('Account disabilitato dopo troppi tentativi falliti. Contatta un amministratore.');
      } else if (newFailedAttempts >= REQUIRE_RECAPTCHA_AFTER) {
        throw new Error(`Credenziali non valide. Tentativo ${newFailedAttempts} di ${MAX_LOGIN_ATTEMPTS}. Verifica reCAPTCHA richiesta.`);
      } else {
        throw new Error(`Credenziali non valide. Tentativo ${newFailedAttempts} di ${MAX_LOGIN_ATTEMPTS}.`);
      }
    }

    // Login riuscito - resetta i contatori
    if (user.failed_login_attempts > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: 0,
          last_failed_attempt: null
        }
      });
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        avatar_url: user.avatar_url
      },
      ...tokens
    };
  }

  static async refreshToken(refreshToken: string) {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return tokens;
  }

  static async unlockUser(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        account_locked: false,
        failed_login_attempts: 0,
        last_failed_attempt: null,
        locked_at: null
      }
    });

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      account_locked: user.account_locked
    };
  }

  static async createUser(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: 'ADMIN' | 'ARTIST';
    selectedGroups?: string[];
  }) {
    console.log('📥 Dati utente ricevuti dal frontend:', JSON.stringify(userData, null, 2));
    
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new Error('Esiste già un utente registrato con questa email');
    }

    const password_hash = await bcrypt.hash(userData.password, 12);

    // Debug: vediamo cosa stiamo per passare a Prisma
    const userDataForPrisma = {
      email: userData.email,
      first_name: userData.first_name,
      last_name: userData.last_name,
      phone: userData.phone || null,
      password_hash,
      role: userData.role || 'ARTIST'
    };
    
    console.log('🔍 Dati che passo a Prisma:', JSON.stringify(userDataForPrisma, null, 2));

    // Crea l'utente con campi espliciti (escludendo password e selectedGroups)
    const user = await prisma.user.create({
      data: {
        email: userDataForPrisma.email,
        first_name: userDataForPrisma.first_name,
        last_name: userDataForPrisma.last_name,
        phone: userDataForPrisma.phone,
        password_hash: userDataForPrisma.password_hash,
        role: userDataForPrisma.role
      }
    });

    // Associa l'utente ai gruppi selezionati
    if (userData.selectedGroups && userData.selectedGroups.length > 0) {
      const groupAssociations = userData.selectedGroups.map(groupId => ({
        user_id: user.id,
        group_id: groupId
      }));

      await prisma.userGroup.createMany({
        data: groupAssociations
      });
    }

    // Invia email di benvenuto e crea notifica per admin in background
    setImmediate(async () => {
      try {
        await sendWelcomeEmail({
          to: user.email,
          userName: `${user.first_name} ${user.last_name}`,
          userEmail: user.email,
          temporaryPassword: userData.password, // Password originale prima dell'hash
          isFirstLogin: true
        });
        console.log(`✅ Email di benvenuto inviata a ${user.email}`);
      } catch (emailError) {
        console.error(`❌ Errore nell'invio email di benvenuto a ${user.email}:`, emailError);
      }

      // Crea notifica per admin solo per registrazioni pubbliche (utenti senza gruppi)
      if (user.role === 'ARTIST' && (!userData.selectedGroups || userData.selectedGroups.length === 0)) {
        try {
          await NotificationService.createNewUserRegistrationNotification({
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name
          });
          console.log(`📬 Notifica creata per nuovo utente: ${user.email}`);
        } catch (notificationError) {
          console.error(`❌ Errore creazione notifica per ${user.email}:`, notificationError);
        }
      }
    });
    
    // Log delle credenziali per debug
    console.log(`📧 Credenziali per ${user.email}:`);
    console.log(`Nome: ${user.first_name} ${user.last_name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Password temporanea: ${userData.password}`);
    console.log(`Ruolo: ${user.role}`);
    if (userData.selectedGroups && userData.selectedGroups.length > 0) {
      console.log(`Gruppi assegnati: ${userData.selectedGroups.length}`);
    }

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      avatar_url: user.avatar_url,
      groups_assigned: userData.selectedGroups?.length || 0
    };
  }
}