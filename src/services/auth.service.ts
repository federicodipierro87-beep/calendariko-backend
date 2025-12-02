import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateTokens, verifyRefreshToken } from '../utils/jwt';

const prisma = new PrismaClient();

export class AuthService {
  static async login(email: string, password: string) {
    try {
      console.log('🔍 Login attempt for email:', email);
      
      const user = await prisma.user.findUnique({
        where: { email }
      });

      console.log('👤 User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('❌ User not found for email:', email);
        throw new Error('Invalid credentials');
      }

      console.log('🔐 Comparing password...');
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      console.log('🔐 Password valid:', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('❌ Invalid password for user:', email);
        throw new Error('Invalid credentials');
      }

      const tokens = generateTokens({
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified
        },
        tokens
      };
    } catch (error) {
      throw error;
    }
  }

  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
    verificationToken?: string;
    verificationTokenExpiresAt?: Date;
    emailVerified?: boolean;
  }) {
    try {
      console.log('📝 Registration attempt for email:', userData.email);
      
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      console.log('👤 Existing user found:', existingUser ? 'Yes' : 'No');
      
      if (existingUser) {
        console.log('❌ User already exists:', userData.email);
        throw new Error('User already exists');
      }

      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      console.log('👤 Creating user...');
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          passwordHash: hashedPassword,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role as any || 'USER',
          emailVerified: userData.emailVerified || false,
          verificationToken: userData.verificationToken,
          verificationTokenExpiresAt: userData.verificationTokenExpiresAt
        }
      });
      console.log('✅ User created successfully:', user.email, 'with role:', user.role, 'emailVerified:', user.emailVerified);

      const tokens = generateTokens({
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified
        },
        tokens
      };
    } catch (error) {
      throw error;
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
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
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      });

      return tokens;
    } catch (error) {
      throw error;
    }
  }

  static async verifyEmail(token: string) {
    try {
      console.log('📧 Email verification attempt for token:', token);
      
      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token,
          emailVerified: false
        }
      });

      console.log('👤 User found for verification:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('❌ Invalid or already used token:', token);
        throw new Error('Token di verifica non valido o già utilizzato');
      }

      // Controlla se il token è scaduto
      if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt < new Date()) {
        console.log('⏰ Token expired for user:', user.email);
        throw new Error('Il token di verifica è scaduto');
      }

      console.log('✅ Verifying email for user:', user.email);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          verificationToken: null,
          verificationTokenExpiresAt: null
        }
      });

      console.log('✅ Email verified successfully for:', updatedUser.email);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified
        }
      };
    } catch (error) {
      throw error;
    }
  }

  static async updateVerificationToken(email: string, token: string, expiresAt: Date) {
    try {
      console.log('🔄 Updating verification token for email:', email);
      
      const user = await prisma.user.findUnique({
        where: { email, emailVerified: false }
      });

      if (!user) {
        console.log('❌ User not found or already verified:', email);
        throw new Error('Utente non trovato o già verificato');
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken: token,
          verificationTokenExpiresAt: expiresAt
        }
      });

      console.log('✅ Verification token updated for:', updatedUser.email);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified
        }
      };
    } catch (error) {
      throw error;
    }
  }
}