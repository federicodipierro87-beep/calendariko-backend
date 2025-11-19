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
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
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
          role: userData.role as any || 'USER'
        }
      });
      console.log('✅ User created successfully:', user.email, 'with role:', user.role);

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
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
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return tokens;
    } catch (error) {
      throw error;
    }
  }
}