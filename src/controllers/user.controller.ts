import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class UserController {
  static async getUsersWithoutGroup(req: Request, res: Response) {
    try {
      // Restituisce utenti che non sono admin e non sono ancora assegnati a gruppi
      // Gli admin non devono essere assegnati a gruppi
      const users = await prisma.user.findMany({
        where: {
          role: {
            not: 'ADMIN' // Esclude gli utenti admin
          }
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(200).json(users);
    } catch (error) {
      console.error('Errore nel recupero degli utenti senza gruppo:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getAllUsers(req: Request, res: Response) {
    try {
      // Recupera tutti gli utenti dal database
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
          // Non includiamo passwordHash per sicurezza
        }
      });
      
      // Il frontend si aspetta direttamente un array
      res.status(200).json(users);
    } catch (error) {
      console.error('Errore nel recupero degli utenti:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error('Errore nel recupero dell\'utente:', error);
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;
      
      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          email,
          role
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(200).json(updatedUser);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento dell\'utente:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }

  static async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await prisma.user.delete({
        where: { id }
      });
      
      res.status(200).json({
        success: true,
        message: 'Utente eliminato con successo'
      });
    } catch (error: any) {
      console.error('Errore nell\'eliminazione dell\'utente:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          message: 'Utente non trovato'
        });
      }
      res.status(500).json({
        success: false,
        message: 'Errore interno del server'
      });
    }
  }
}