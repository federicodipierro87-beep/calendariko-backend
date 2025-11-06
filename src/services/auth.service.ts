import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';
import { sendWelcomeEmail } from './email.service';

const prisma = new PrismaClient();

export class AuthService {
  static async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
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

    // Invia email di benvenuto
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
      // Non blocchiamo la registrazione se l'email fallisce
    }
    
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