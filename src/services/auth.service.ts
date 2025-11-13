import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { sendWelcomeEmail } from './email.service';
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
    console.log('🔍 LOGIN ATTEMPT - Email:', email, 'ReCAPTCHA:', !!recaptchaToken);
    
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('🔍 USER NOT FOUND - Email:', email);
      throw new Error('USER_NOT_FOUND');
    }
    
    console.log('🔍 USER FOUND - Failed attempts:', user.failed_login_attempts, 'Account locked:', user.account_locked);

    // Controlla se l'account è bloccato
    if (user.account_locked) {
      throw new Error('Account disabilitato. Contatta un amministratore per la riattivazione.');
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
      
      console.log('🔍 PASSWORD INVALID - Incrementing attempts from', user.failed_login_attempts, 'to', newFailedAttempts);
      
      // Blocca l'account se raggiunge il limite massimo
      const shouldLockAccount = newFailedAttempts >= MAX_LOGIN_ATTEMPTS;
      console.log('🔍 SHOULD LOCK ACCOUNT?', shouldLockAccount, '(attempts:', newFailedAttempts, '>=', MAX_LOGIN_ATTEMPTS, ')');

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: newFailedAttempts,
          last_failed_attempt: new Date(),
          account_locked: shouldLockAccount,
          locked_at: shouldLockAccount ? new Date() : null
        }
      });
      
      console.log('🔍 USER UPDATED - New attempts:', newFailedAttempts, 'Locked:', shouldLockAccount);

      if (shouldLockAccount) {
        console.log('🔍 THROWING ACCOUNT LOCKED ERROR');
        throw new Error('Account disabilitato dopo troppi tentativi falliti. Contatta un amministratore.');
      } else if (newFailedAttempts >= REQUIRE_RECAPTCHA_AFTER) {
        console.log('🔍 THROWING RECAPTCHA REQUIRED ERROR');
        throw new Error(`Credenziali non valide. Tentativo ${newFailedAttempts} di ${MAX_LOGIN_ATTEMPTS}. Verifica reCAPTCHA richiesta.`);
      } else {
        console.log('🔍 THROWING STANDARD ERROR');
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
      throw new Error('User already exists');
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

    // Invia email di benvenuto in background per non rallentare la risposta
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