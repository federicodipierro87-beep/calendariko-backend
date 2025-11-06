import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export class UserService {
  static async getAllUsers() {
    return await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        avatar_url: true,
        created_at: true,
        user_groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    });
  }

  static async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        avatar_url: true,
        created_at: true,
        user_groups: {
          include: {
            group: {
              select: {
                id: true,
                name: true,
                type: true,
                description: true
              }
            }
          }
        }
      }
    });
  }

  static async updateUser(id: string, data: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    role?: 'ADMIN' | 'ARTIST';
    avatar_url?: string;
  }) {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: true,
        avatar_url: true,
        updated_at: true
      }
    });
  }

  static async deleteUser(id: string) {
    return await prisma.user.delete({
      where: { id }
    });
  }

  static async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    const password_hash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password_hash }
    });

    return { message: 'Password updated successfully' };
  }
}