import { Request, Response } from 'express';
import { 
  sendTestEmail,
  sendWelcomeEmail,
  sendGroupModificationNotification,
  sendEventModificationNotification,
  sendEventDeletionNotification,
  sendGroupInvitationEmail,
  sendEventConfirmationNotification,
  sendPasswordResetEmail,
  sendUnavailabilityModificationNotification
} from '../services/email.service';

export const testEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendTestEmail(email);
    
    res.json({
      success: true,
      message: `Email di test inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email di test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email di test',
      error: error.message
    });
  }
};

export const emailStatus = async (req: Request, res: Response) => {
  try {
    // Verifica configurazione email
    const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
    
    res.json({
      success: true,
      data: {
        configured: emailConfigured,
        emailUser: process.env.EMAIL_USER || 'Non configurato',
        service: 'Gmail',
        features: [
          'Notifiche nuovi eventi',
          'Richieste disponibilità', 
          'Notifiche indisponibilità',
          'Promemoria eventi',
          'Email di test'
        ]
      }
    });
  } catch (error: any) {
    console.error('Errore nel controllo status email:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel controllo configurazione email',
      error: error.message
    });
  }
};

// Test specifici per ogni template
export const testWelcomeEmail = async (req: Request, res: Response) => {
  try {
    const { email, userName = 'Utente Test', temporaryPassword } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendWelcomeEmail({
      to: email,
      userName,
      userEmail: email,
      temporaryPassword,
      isFirstLogin: !!temporaryPassword
    });
    
    res.json({
      success: true,
      message: `Email di benvenuto inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email di benvenuto test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email di benvenuto test',
      error: error.message
    });
  }
};

export const testGroupModificationEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      userName = 'Utente Test',
      groupName = 'Gruppo Test',
      modificationType = 'name',
      oldValue = 'Vecchio Nome',
      newValue = 'Nuovo Nome',
      adminName = 'Admin Test'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendGroupModificationNotification({
      to: [email],
      userName,
      groupName,
      modificationType,
      oldValue,
      newValue,
      adminName
    });
    
    res.json({
      success: true,
      message: `Email modifica gruppo inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email modifica gruppo test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email modifica gruppo test',
      error: error.message
    });
  }
};

export const testEventModificationEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Utente Test',
      eventTitle = 'Evento Test',
      eventDate = new Date().toISOString(),
      groupName = 'Gruppo Test',
      modificationType = 'date',
      oldValue = '2024-12-01',
      newValue = '2024-12-15',
      adminName = 'Admin Test'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendEventModificationNotification({
      to: [email],
      userName,
      eventTitle,
      eventDate,
      groupName,
      modificationType,
      oldValue,
      newValue,
      adminName
    });
    
    res.json({
      success: true,
      message: `Email modifica evento inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email modifica evento test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email modifica evento test',
      error: error.message
    });
  }
};

export const testEventDeletionEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Utente Test',
      eventTitle = 'Evento Cancellato',
      eventDate = new Date().toISOString(),
      eventTime = '20:00',
      venueName = 'Venue Test',
      groupName = 'Gruppo Test',
      deletionReason = 'Motivi organizzativi',
      adminName = 'Admin Test'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendEventDeletionNotification({
      to: [email],
      userName,
      eventTitle,
      eventDate,
      eventTime,
      venueName,
      groupName,
      deletionReason,
      adminName
    });
    
    res.json({
      success: true,
      message: `Email cancellazione evento inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email cancellazione evento test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email cancellazione evento test',
      error: error.message
    });
  }
};

export const testGroupInvitationEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Nuovo Membro',
      groupName = 'Gruppo Test',
      inviterName = 'Admin Test',
      groupType = 'BAND',
      groupGenre = 'Rock'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendGroupInvitationEmail({
      to: email,
      userName,
      groupName,
      inviterName,
      groupType,
      groupGenre
    });
    
    res.json({
      success: true,
      message: `Email invito gruppo inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email invito gruppo test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email invito gruppo test',
      error: error.message
    });
  }
};

export const testEventConfirmationEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Artista Test',
      eventTitle = 'Evento Test',
      eventDate = new Date().toISOString(),
      groupName = 'Gruppo Test',
      confirmationType = 'confirmed',
      notes = 'Confermo la mia partecipazione'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendEventConfirmationNotification({
      to: [email],
      userName,
      eventTitle,
      eventDate,
      groupName,
      confirmationType,
      notes
    });
    
    res.json({
      success: true,
      message: `Email conferma evento inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email conferma evento test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email conferma evento test',
      error: error.message
    });
  }
};

export const testPasswordResetEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Utente Test',
      resetLink = 'https://calendariko.com/reset-password?token=abc123',
      expirationTime = new Date(Date.now() + 3600000).toLocaleString('it-IT')
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendPasswordResetEmail({
      to: email,
      userName,
      resetLink,
      expirationTime
    });
    
    res.json({
      success: true,
      message: `Email reset password inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email reset password test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email reset password test',
      error: error.message
    });
  }
};

export const testUnavailabilityModificationEmail = async (req: Request, res: Response) => {
  try {
    const { 
      email,
      userName = 'Artista Test',
      date = new Date().toISOString(),
      groupName = 'Gruppo Test',
      modificationType = 'created',
      oldNotes = 'Vecchie note',
      newNotes = 'Nuove note',
      adminName = 'Admin Test'
    } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email richiesta per il test'
      });
    }

    await sendUnavailabilityModificationNotification({
      to: [email],
      userName,
      date,
      groupName,
      modificationType,
      oldNotes,
      newNotes,
      adminName
    });
    
    res.json({
      success: true,
      message: `Email modifica indisponibilità inviata con successo a ${email}`
    });
  } catch (error: any) {
    console.error('Errore nell\'invio email modifica indisponibilità test:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nell\'invio email modifica indisponibilità test',
      error: error.message
    });
  }
};

// Lista di tutti i template disponibili
export const getEmailTemplates = async (req: Request, res: Response) => {
  try {
    const templates = [
      {
        name: 'welcome',
        description: 'Email di benvenuto per nuovi utenti',
        endpoint: '/api/email/test/welcome',
        parameters: ['email', 'userName', 'temporaryPassword?']
      },
      {
        name: 'group-modification',
        description: 'Notifica modifica gruppo',
        endpoint: '/api/email/test/group-modification',
        parameters: ['email', 'userName', 'groupName', 'modificationType', 'oldValue', 'newValue', 'adminName']
      },
      {
        name: 'event-modification',
        description: 'Notifica modifica evento',
        endpoint: '/api/email/test/event-modification',
        parameters: ['email', 'userName', 'eventTitle', 'eventDate', 'groupName', 'modificationType', 'oldValue', 'newValue', 'adminName']
      },
      {
        name: 'event-deletion',
        description: 'Notifica cancellazione evento',
        endpoint: '/api/email/test/event-deletion',
        parameters: ['email', 'userName', 'eventTitle', 'eventDate', 'eventTime', 'venueName', 'groupName', 'deletionReason?', 'adminName']
      },
      {
        name: 'group-invitation',
        description: 'Invito nuovo membro gruppo',
        endpoint: '/api/email/test/group-invitation',
        parameters: ['email', 'userName', 'groupName', 'inviterName', 'groupType', 'groupGenre?']
      },
      {
        name: 'event-confirmation',
        description: 'Conferma partecipazione evento',
        endpoint: '/api/email/test/event-confirmation',
        parameters: ['email', 'userName', 'eventTitle', 'eventDate', 'groupName', 'confirmationType', 'notes?']
      },
      {
        name: 'password-reset',
        description: 'Reset password',
        endpoint: '/api/email/test/password-reset',
        parameters: ['email', 'userName', 'resetLink', 'expirationTime']
      },
      {
        name: 'unavailability-modification',
        description: 'Modifica indisponibilità',
        endpoint: '/api/email/test/unavailability-modification',
        parameters: ['email', 'userName', 'date', 'groupName', 'modificationType', 'oldNotes?', 'newNotes?', 'adminName?']
      },
      {
        name: 'basic-test',
        description: 'Email di test base',
        endpoint: '/api/email/test',
        parameters: ['email']
      }
    ];

    res.json({
      success: true,
      data: {
        templates,
        totalTemplates: templates.length,
        description: 'Tutti i template email disponibili in Calendariko'
      }
    });
  } catch (error: any) {
    console.error('Errore nel recupero template email:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel recupero template email',
      error: error.message
    });
  }
};