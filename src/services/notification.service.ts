import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationService {
  static async createNewUserRegistrationNotification(newUser: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  }) {
    await prisma.notification.create({
      data: {
        type: 'NEW_USER_REGISTRATION',
        title: 'Nuova registrazione utente',
        message: `${newUser.first_name} ${newUser.last_name} (${newUser.email}) si è registrato e necessita di essere assegnato a un gruppo.`,
        user_id: null, // Visibile a tutti gli admin
        data: {
          newUserId: newUser.id,
          userEmail: newUser.email,
          userName: `${newUser.first_name} ${newUser.last_name}`
        }
      }
    });
  }

  static async getAdminNotifications() {
    return await prisma.notification.findMany({
      where: {
        user_id: null // Notifiche per tutti gli admin
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  static async markNotificationAsRead(notificationId: string) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true }
    });
  }

  static async markAllNotificationsAsRead() {
    await prisma.notification.updateMany({
      where: {
        user_id: null,
        is_read: false
      },
      data: { is_read: true }
    });
  }

  static async deleteNotification(notificationId: string) {
    await prisma.notification.delete({
      where: { id: notificationId }
    });
  }

  static async getUnreadNotificationsCount(): Promise<number> {
    return await prisma.notification.count({
      where: {
        user_id: null,
        is_read: false
      }
    });
  }
}