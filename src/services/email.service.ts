import nodemailer from 'nodemailer';

// Configurazione del transporter con settings più robusti
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465 SSL
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASSWORD || 'your-app-password'
  },
  connectionTimeout: 30000, // 30 seconds (ridotto)
  greetingTimeout: 15000,   // 15 seconds (ridotto) 
  socketTimeout: 30000,     // 30 seconds (ridotto)
  pool: true,
  maxConnections: 3,
  maxMessages: 50,
  tls: {
    rejectUnauthorized: false,
    ciphers: 'SSLv3'
  }
});

// Verifica la configurazione email solo se richiesto (non all'avvio)
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Server email configurato correttamente');
    return true;
  } catch (error: any) {
    console.error('❌ Errore configurazione email:', error);
    return false;
  }
};

interface EventNotificationData {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueCity: string;
  groupName: string;
  creatorName: string;
  notes: string;
}

// Funzione helper per retry con backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries: number = 3): Promise<any> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      console.log(`🔄 Tentativo ${i + 1}/${maxRetries} fallito:`, error.message);
      if (i === maxRetries - 1) throw error;
      // Wait 2^i seconds before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

export const sendEventNotification = async (data: EventNotificationData): Promise<void> => {
  const {
    to,
    userName,
    eventTitle,
    eventDate,
    eventTime,
    venueName,
    venueCity,
    groupName,
    creatorName,
    notes
  } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nuovo Evento - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
            .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .detail-row { margin: 10px 0; }
            .label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Nuovo Evento Assegnato</h2>
            </div>
            
            <div class="content">
                <p>Ciao <strong>${userName}</strong>,</p>
                
                <p>Hai ricevuto un nuovo evento da <strong>${creatorName}</strong> per il gruppo <strong>${groupName}</strong>.</p>
                
                <div class="event-details">
                    <h3>📅 Dettagli Evento</h3>
                    
                    <div class="detail-row">
                        <span class="label">🎤 Titolo:</span> ${eventTitle}
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">📅 Data:</span> ${formattedDate}
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">⏰ Orario:</span> ${eventTime}
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">📍 Venue:</span> ${venueName}, ${venueCity}
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">👥 Gruppo:</span> ${groupName}
                    </div>
                    
                    <div class="detail-row">
                        <span class="label">👤 Creato da:</span> ${creatorName}
                    </div>
                    
                    ${notes ? `
                    <div class="detail-row">
                        <span class="label">📝 Note:</span> ${notes}
                    </div>
                    ` : ''}
                </div>
                
                <p>Accedi a Calendariko per confermare la tua partecipazione e visualizzare tutti i dettagli dell'evento.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🎵 Nuovo Evento: ${eventTitle} - ${formattedDate}`,
    html: htmlContent
  };

  try {
    const info = await retryWithBackoff(() => transporter.sendMail(mailOptions));
    console.log(`📧 Email inviata a ${to}:`, info.messageId);
  } catch (error: any) {
    console.error(`❌ Errore nell'invio email a ${to} dopo ${3} tentativi:`, error.message);
    // Non lanciare errore per non bloccare il processo
  }
};

// Interface per richiesta disponibilità
interface AvailabilityRequestData {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  groupName: string;
  adminName: string;
}

// Interface per notifica indisponibilità
interface UnavailabilityNotificationData {
  to: string[];
  userName: string;
  date: string;
  groupName: string;
  notes?: string;
}

// Interface per promemoria evento
interface EventReminderData {
  to: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  groupName: string;
}

// Funzione per inviare richiesta di disponibilità
export const sendAvailabilityRequest = async (data: AvailabilityRequestData): Promise<void> => {
  const { to, userName, eventTitle, eventDate, groupName, adminName } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Richiesta Disponibilità - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .cta-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Richiesta Disponibilità</h2>
            </div>
            
            <div class="content">
                <p>Ciao <strong>${userName}</strong>,</p>
                
                <p><strong>${adminName}</strong> ha bisogno di confermare la tua disponibilità per il gruppo <strong>${groupName}</strong>.</p>
                
                <div class="event-details">
                    <h3>📅 Dettagli Evento</h3>
                    <p><strong>🎤 Evento:</strong> ${eventTitle}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                </div>
                
                <p>Ti preghiamo di accedere a Calendariko per confermare la tua disponibilità il prima possibile.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `📅 Richiesta Disponibilità: ${eventTitle} - ${formattedDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Richiesta disponibilità inviata a ${to}:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio richiesta disponibilità a ${to}:`, error);
    throw error;
  }
};

// Funzione per notificare indisponibilità
export const sendUnavailabilityNotification = async (data: UnavailabilityNotificationData): Promise<void> => {
  const { to, userName, date, groupName, notes } = data;

  const formattedDate = new Date(date).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Notifica Indisponibilità - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; }
            .unavailability-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Notifica Indisponibilità</h2>
            </div>
            
            <div class="content">
                <p><strong>${userName}</strong> ha segnalato una indisponibilità per il gruppo <strong>${groupName}</strong>.</p>
                
                <div class="unavailability-details">
                    <h3>❌ Dettagli Indisponibilità</h3>
                    <p><strong>👤 Artista:</strong> ${userName}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                    ${notes ? `<p><strong>📝 Motivo:</strong> ${notes}</p>` : ''}
                </div>
                
                <p>Tieni conto di questa indisponibilità nella pianificazione degli eventi.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `❌ Notifica Indisponibilità: ${userName} - ${formattedDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica indisponibilità inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica indisponibilità:`, error);
    throw error;
  }
};

// Funzione per inviare promemoria evento
export const sendEventReminder = async (data: EventReminderData): Promise<void> => {
  const { to, userName, eventTitle, eventDate, eventTime, venueName, groupName } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Promemoria Evento - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
            .reminder-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Promemoria Evento</h2>
            </div>
            
            <div class="content">
                <p>Ciao <strong>${userName}</strong>,</p>
                
                <p>Ti ricordiamo che hai un evento in programma a breve!</p>
                
                <div class="reminder-details">
                    <h3>⏰ Promemoria</h3>
                    <p><strong>🎤 Evento:</strong> ${eventTitle}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>⏰ Orario:</strong> ${eventTime}</p>
                    <p><strong>📍 Venue:</strong> ${venueName}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                </div>
                
                <p>Non dimenticare di prepararti per l'evento!</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `⏰ Promemoria: ${eventTitle} - ${formattedDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Promemoria evento inviato a ${to}:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio promemoria a ${to}:`, error);
    throw error;
  }
};

// Funzione per inviare email di test
// Interface per benvenuto nuovo utente
interface WelcomeUserData {
  to: string;
  userName: string;
  userEmail: string;
  temporaryPassword?: string;
  isFirstLogin: boolean;
}

// Interface per modifica gruppo
interface GroupModificationData {
  to: string[];
  userName: string;
  groupName: string;
  modificationType: 'name' | 'description' | 'genre' | 'members';
  oldValue?: string;
  newValue?: string;
  adminName: string;
}

// Interface per modifica evento
interface EventModificationData {
  to: string[];
  userName: string;
  eventTitle: string;
  eventDate: string;
  groupName: string;
  modificationType: 'date' | 'time' | 'venue' | 'title' | 'notes';
  oldValue?: string;
  newValue?: string;
  adminName: string;
}

// Interface per eliminazione evento
interface EventDeletionData {
  to: string[];
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  groupName: string;
  deletionReason?: string;
  adminName: string;
}

// Interface per invito nuovo membro
interface GroupInvitationData {
  to: string;
  userName: string;
  groupName: string;
  inviterName: string;
  groupType: string;
  groupGenre?: string;
}

// Interface per conferma partecipazione
interface EventConfirmationData {
  to: string[];
  userName: string;
  eventTitle: string;
  eventDate: string;
  groupName: string;
  confirmationType: 'confirmed' | 'declined';
  notes?: string;
}

// Interface per reset password
interface PasswordResetData {
  to: string;
  userName: string;
  resetLink: string;
  expirationTime: string;
}

// Interface per modifica indisponibilità
interface UnavailabilityModificationData {
  to: string[];
  userName: string;
  date: string;
  groupName: string;
  modificationType: 'created' | 'updated' | 'deleted';
  oldNotes?: string;
  newNotes?: string;
  adminName?: string;
}

// Funzione per email di benvenuto nuovo utente
export const sendWelcomeEmail = async (data: WelcomeUserData): Promise<void> => {
  const { to, userName, userEmail, temporaryPassword, isFirstLogin } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Benvenuto in Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #faf5ff; padding: 30px; border-radius: 0 0 10px 10px; }
            .welcome-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
            .credentials-box { background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #d1d5db; }
            .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Benvenuto nella Community!</h2>
            </div>
            
            <div class="content">
                <div class="welcome-box">
                    <h3>🎉 Ciao ${userName}!</h3>
                    <p>Benvenuto in <strong>Calendariko</strong>, la piattaforma per gestire eventi e disponibilità per band e DJ!</p>
                    
                    ${temporaryPassword ? `
                    <div class="credentials-box">
                        <h4>🔐 Le tue credenziali di accesso:</h4>
                        <p><strong>Email:</strong> ${userEmail}</p>
                        <p><strong>Password temporanea:</strong> ${temporaryPassword}</p>
                        <p><em>⚠️ Ti consigliamo di cambiare la password al primo accesso per sicurezza.</em></p>
                    </div>
                    ` : ''}
                    
                    <h4>🎯 Cosa puoi fare con Calendariko:</h4>
                    <ul>
                        <li>📅 Visualizzare eventi e concerti</li>
                        <li>✅ Confermare la tua disponibilità</li>
                        <li>❌ Segnalare indisponibilità</li>
                        <li>👥 Gestire i tuoi gruppi musicali</li>
                        <li>📧 Ricevere notifiche automatiche</li>
                        <li>📱 Accedere da qualsiasi dispositivo</li>
                    </ul>
                </div>
                
                <p>Inizia subito ad esplorare la piattaforma e scopri tutte le funzionalità disponibili!</p>
                
                <div class="footer">
                    <p>Hai domande? Contatta l'amministratore del sistema.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🎵 Benvenuto in Calendariko, ${userName}!`,
    html: htmlContent
  };

  try {
    console.log('📧 [DEBUG] Tentativo invio email di benvenuto...');
    console.log('📧 [DEBUG] EMAIL_USER:', process.env.EMAIL_USER ? 'configurato' : 'NON configurato');
    console.log('📧 [DEBUG] EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? 'configurato' : 'NON configurato');
    console.log('📧 [DEBUG] Destinatario:', to);
    console.log('📧 [DEBUG] From:', mailOptions.from);
    console.log('📧 [DEBUG] Subject:', mailOptions.subject);
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email di benvenuto inviata con successo a ${to}:`, info.messageId);
    console.log('✅ [DEBUG] Info completa:', JSON.stringify(info, null, 2));
  } catch (error) {
    console.error(`❌ Errore nell'invio email di benvenuto a ${to}:`, error);
    console.error('❌ [DEBUG] Stack trace:', (error as Error).stack);
    throw error;
  }
};

// Funzione per notifica modifica gruppo
export const sendGroupModificationNotification = async (data: GroupModificationData): Promise<void> => {
  const { to, userName, groupName, modificationType, oldValue, newValue, adminName } = data;

  const modificationText = {
    name: `Nome gruppo cambiato da "${oldValue}" a "${newValue}"`,
    description: `Descrizione gruppo aggiornata`,
    genre: `Genere musicale cambiato da "${oldValue}" a "${newValue}"`,
    members: `Membri del gruppo modificati`
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Modifica Gruppo - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #ecfeff; padding: 30px; border-radius: 0 0 10px 10px; }
            .modification-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #06b6d4; }
            .change-item { background: #f0f9ff; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Gruppo Modificato</h2>
            </div>
            
            <div class="content">
                <p>Il gruppo <strong>${groupName}</strong> è stato modificato da <strong>${adminName}</strong>.</p>
                
                <div class="modification-details">
                    <h3>🔄 Dettagli Modifica</h3>
                    
                    <div class="change-item">
                        <strong>👥 Gruppo:</strong> ${groupName}
                    </div>
                    
                    <div class="change-item">
                        <strong>🔧 Tipo modifica:</strong> ${modificationText[modificationType]}
                    </div>
                    
                    <div class="change-item">
                        <strong>👤 Modificato da:</strong> ${adminName}
                    </div>
                    
                    <div class="change-item">
                        <strong>🕐 Data modifica:</strong> ${new Date().toLocaleString('it-IT')}
                    </div>
                </div>
                
                <p>Accedi a Calendariko per visualizzare tutti i dettagli aggiornati del gruppo.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🔄 Gruppo Modificato: ${groupName}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica modifica gruppo inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica modifica gruppo:`, error);
    throw error;
  }
};

export const sendTestEmail = async (to: string): Promise<any> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #eff6ff; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Test Email</h2>
            </div>
            
            <div class="content">
                <div class="success-box">
                    <h3>✅ Email di Test Riuscita!</h3>
                    <p>Congratulazioni! Il sistema email di Calendariko è configurato correttamente e funziona perfettamente.</p>
                    <p><strong>Data Test:</strong> ${new Date().toLocaleString('it-IT')}</p>
                </div>
                
                <p>Tutti i tipi di notifiche email sono ora disponibili:</p>
                <ul>
                    <li>🎤 Notifiche nuovi eventi</li>
                    <li>📅 Richieste disponibilità</li>
                    <li>❌ Notifiche indisponibilità</li>
                    <li>⏰ Promemoria eventi</li>
                </ul>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `✅ Test Email Calendariko - ${new Date().toLocaleDateString('it-IT')}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email di test inviata a ${to}:`, info.messageId);
    return info;
  } catch (error) {
    console.error(`Errore nell'invio email di test a ${to}:`, error);
    throw error;
  }
};

// Funzione per notifica modifica evento
export const sendEventModificationNotification = async (data: EventModificationData): Promise<void> => {
  const { to, userName, eventTitle, eventDate, groupName, modificationType, oldValue, newValue, adminName } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const modificationText = {
    date: `Data cambiata da "${oldValue}" a "${newValue}"`,
    time: `Orario cambiato da "${oldValue}" a "${newValue}"`,
    venue: `Venue cambiato da "${oldValue}" a "${newValue}"`,
    title: `Titolo cambiato da "${oldValue}" a "${newValue}"`,
    notes: `Note aggiornate`
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Evento Modificato - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fffbeb; padding: 30px; border-radius: 0 0 10px 10px; }
            .modification-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .change-highlight { background: #fef3c7; padding: 8px; border-radius: 4px; margin: 8px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Evento Modificato</h2>
            </div>
            
            <div class="content">
                <p>L'evento <strong>"${eventTitle}"</strong> è stato modificato da <strong>${adminName}</strong>.</p>
                
                <div class="modification-details">
                    <h3>🔄 Dettagli Modifica</h3>
                    
                    <p><strong>🎤 Evento:</strong> ${eventTitle}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                    
                    <div class="change-highlight">
                        <strong>🔧 Modifica effettuata:</strong> ${modificationText[modificationType]}
                    </div>
                    
                    <p><strong>👤 Modificato da:</strong> ${adminName}</p>
                    <p><strong>🕐 Data modifica:</strong> ${new Date().toLocaleString('it-IT')}</p>
                </div>
                
                <p>⚠️ <strong>Importante:</strong> Verifica i nuovi dettagli dell'evento e conferma nuovamente la tua partecipazione se necessario.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🔄 Evento Modificato: ${eventTitle}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica modifica evento inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica modifica evento:`, error);
    throw error;
  }
};

// Funzione per notifica eliminazione evento
export const sendEventDeletionNotification = async (data: EventDeletionData): Promise<void> => {
  const { to, userName, eventTitle, eventDate, eventTime, venueName, groupName, deletionReason, adminName } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Evento Cancellato - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fef2f2; padding: 30px; border-radius: 0 0 10px 10px; }
            .deletion-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .warning-box { background: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #fca5a5; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Evento Cancellato</h2>
            </div>
            
            <div class="content">
                <div class="warning-box">
                    <h3>⚠️ Attenzione</h3>
                    <p>L'evento <strong>"${eventTitle}"</strong> è stato cancellato da <strong>${adminName}</strong>.</p>
                </div>
                
                <div class="deletion-details">
                    <h3>❌ Dettagli Evento Cancellato</h3>
                    
                    <p><strong>🎤 Evento:</strong> ${eventTitle}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>⏰ Orario:</strong> ${eventTime}</p>
                    <p><strong>📍 Venue:</strong> ${venueName}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                    
                    ${deletionReason ? `
                    <div style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
                        <strong>📝 Motivo cancellazione:</strong> ${deletionReason}
                    </div>
                    ` : ''}
                    
                    <p><strong>👤 Cancellato da:</strong> ${adminName}</p>
                    <p><strong>🕐 Data cancellazione:</strong> ${new Date().toLocaleString('it-IT')}</p>
                </div>
                
                <p>Ci scusiamo per l'inconveniente. Controlla il calendario per eventuali nuovi eventi o riprogrammazioni.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `❌ Evento Cancellato: ${eventTitle} - ${formattedDate}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica cancellazione evento inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica cancellazione evento:`, error);
    throw error;
  }
};

// Funzione per invito nuovo membro gruppo
export const sendGroupInvitationEmail = async (data: GroupInvitationData): Promise<void> => {
  const { to, userName, groupName, inviterName, groupType, groupGenre } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invito Gruppo - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f0fdf4; padding: 30px; border-radius: 0 0 10px 10px; }
            .invitation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .group-info { background: #ecfdf5; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .cta-button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; text-align: center; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Invito al Gruppo</h2>
            </div>
            
            <div class="content">
                <div class="invitation-details">
                    <h3>🎉 Hai ricevuto un invito!</h3>
                    <p>Ciao <strong>${userName}</strong>,</p>
                    <p><strong>${inviterName}</strong> ti ha invitato a far parte del gruppo <strong>"${groupName}"</strong> su Calendariko!</p>
                    
                    <div class="group-info">
                        <h4>👥 Informazioni Gruppo</h4>
                        <p><strong>🎵 Nome:</strong> ${groupName}</p>
                        <p><strong>🎯 Tipo:</strong> ${groupType}</p>
                        ${groupGenre ? `<p><strong>🎸 Genere:</strong> ${groupGenre}</p>` : ''}
                        <p><strong>👤 Invitato da:</strong> ${inviterName}</p>
                    </div>
                    
                    <h4>🎯 Cosa potrai fare:</h4>
                    <ul>
                        <li>📅 Visualizzare eventi del gruppo</li>
                        <li>✅ Confermare la tua disponibilità</li>
                        <li>❌ Segnalare indisponibilità</li>
                        <li>📧 Ricevere notifiche automatiche</li>
                        <li>🤝 Collaborare con altri membri</li>
                    </ul>
                </div>
                
                <p>Accedi a Calendariko per accettare l'invito e iniziare a collaborare con il gruppo!</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🎵 Invito al Gruppo: ${groupName}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Invito gruppo inviato a ${to}:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio invito gruppo a ${to}:`, error);
    throw error;
  }
};

// Funzione per conferma partecipazione evento
export const sendEventConfirmationNotification = async (data: EventConfirmationData): Promise<void> => {
  const { to, userName, eventTitle, eventDate, groupName, confirmationType, notes } = data;

  const formattedDate = new Date(eventDate).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isConfirmed = confirmationType === 'confirmed';
  const statusColor = isConfirmed ? '#10b981' : '#ef4444';
  const statusBg = isConfirmed ? '#f0fdf4' : '#fef2f2';
  const statusIcon = isConfirmed ? '✅' : '❌';
  const statusText = isConfirmed ? 'Confermata' : 'Declinata';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Risposta Evento - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: ${statusBg}; padding: 30px; border-radius: 0 0 10px 10px; }
            .confirmation-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
            .status-box { background: ${statusBg}; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Risposta Evento</h2>
            </div>
            
            <div class="content">
                <p><strong>${userName}</strong> ha risposto all'evento <strong>"${eventTitle}"</strong>.</p>
                
                <div class="confirmation-details">
                    <div class="status-box">
                        <h3>${statusIcon} Partecipazione ${statusText}</h3>
                    </div>
                    
                    <p><strong>👤 Artista:</strong> ${userName}</p>
                    <p><strong>🎤 Evento:</strong> ${eventTitle}</p>
                    <p><strong>📅 Data:</strong> ${formattedDate}</p>
                    <p><strong>👥 Gruppo:</strong> ${groupName}</p>
                    <p><strong>📊 Stato:</strong> ${statusText}</p>
                    
                    ${notes ? `
                    <div style="background: #f3f4f6; padding: 10px; border-radius: 4px; margin: 10px 0;">
                        <strong>📝 Note:</strong> ${notes}
                    </div>
                    ` : ''}
                    
                    <p><strong>🕐 Data risposta:</strong> ${new Date().toLocaleString('it-IT')}</p>
                </div>
                
                <p>Questa informazione è stata registrata nel sistema per la pianificazione dell'evento.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `${statusIcon} Risposta Evento: ${userName} - ${eventTitle}`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica conferma evento inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica conferma evento:`, error);
    throw error;
  }
};

// Funzione per reset password
export const sendPasswordResetEmail = async (data: PasswordResetData): Promise<void> => {
  const { to, userName, resetLink, expirationTime } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Password - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
            .reset-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6366f1; }
            .reset-button { display: inline-block; background: #6366f1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; text-align: center; font-weight: bold; }
            .warning-box { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border: 1px solid #f59e0b; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Reset Password</h2>
            </div>
            
            <div class="content">
                <div class="reset-details">
                    <h3>🔐 Richiesta Reset Password</h3>
                    <p>Ciao <strong>${userName}</strong>,</p>
                    <p>Hai richiesto di reimpostare la password per il tuo account Calendariko.</p>
                    
                    <div style="text-align: center;">
                        <a href="${resetLink}" class="reset-button">
                            🔑 Reimposta Password
                        </a>
                    </div>
                    
                    <div class="warning-box">
                        <h4>⚠️ Informazioni Importanti</h4>
                        <ul>
                            <li><strong>Scadenza:</strong> ${expirationTime}</li>
                            <li>Questo link è valido per <strong>1 ora</strong></li>
                            <li>Può essere utilizzato <strong>una sola volta</strong></li>
                            <li>Se non hai richiesto questo reset, ignora questa email</li>
                        </ul>
                    </div>
                    
                    <p><small>Se il pulsante non funziona, copia e incolla questo link nel browser:<br>
                    <code style="background: #f3f4f6; padding: 5px; border-radius: 3px; word-break: break-all;">${resetLink}</code></small></p>
                </div>
                
                <p>Per qualsiasi problema, contatta l'amministratore del sistema.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `🔐 Reset Password - Calendariko`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email reset password inviata a ${to}:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio email reset password a ${to}:`, error);
    throw error;
  }
};

// Funzione per modifica indisponibilità migliorata
export const sendUnavailabilityModificationNotification = async (data: UnavailabilityModificationData): Promise<void> => {
  const { to, userName, date, groupName, modificationType, oldNotes, newNotes, adminName } = data;

  const formattedDate = new Date(date).toLocaleDateString('it-IT', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const actionText = {
    created: '🆕 Nuova indisponibilità inserita',
    updated: '🔄 Indisponibilità modificata',
    deleted: '❌ Indisponibilità rimossa'
  };

  const colorScheme = {
    created: { primary: '#ef4444', bg: '#fef2f2' },
    updated: { primary: '#f59e0b', bg: '#fffbeb' },
    deleted: { primary: '#10b981', bg: '#f0fdf4' }
  };

  const colors = colorScheme[modificationType];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Modifica Indisponibilità - Calendariko</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: ${colors.bg}; padding: 30px; border-radius: 0 0 10px 10px; }
            .modification-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${colors.primary}; }
            .change-item { background: ${colors.bg}; padding: 10px; border-radius: 4px; margin: 10px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎵 Calendariko</h1>
                <h2>Modifica Indisponibilità</h2>
            </div>
            
            <div class="content">
                <h3>${actionText[modificationType]}</h3>
                <p><strong>${userName}</strong> ha ${modificationType === 'created' ? 'inserito' : modificationType === 'updated' ? 'modificato' : 'rimosso'} una indisponibilità per il gruppo <strong>${groupName}</strong>.</p>
                
                <div class="modification-details">
                    <div class="change-item">
                        <strong>👤 Artista:</strong> ${userName}
                    </div>
                    
                    <div class="change-item">
                        <strong>📅 Data:</strong> ${formattedDate}
                    </div>
                    
                    <div class="change-item">
                        <strong>👥 Gruppo:</strong> ${groupName}
                    </div>
                    
                    <div class="change-item">
                        <strong>🔧 Azione:</strong> ${actionText[modificationType]}
                    </div>
                    
                    ${modificationType === 'updated' && oldNotes && newNotes ? `
                    <div class="change-item">
                        <strong>📝 Note precedenti:</strong> ${oldNotes}
                    </div>
                    <div class="change-item">
                        <strong>📝 Nuove note:</strong> ${newNotes}
                    </div>
                    ` : ''}
                    
                    ${(modificationType === 'created' || modificationType === 'updated') && newNotes ? `
                    <div class="change-item">
                        <strong>📝 Note:</strong> ${newNotes}
                    </div>
                    ` : ''}
                    
                    ${adminName ? `
                    <div class="change-item">
                        <strong>👤 ${modificationType === 'created' ? 'Inserita' : 'Modificata'} da:</strong> ${adminName}
                    </div>
                    ` : ''}
                    
                    <div class="change-item">
                        <strong>🕐 Data modifica:</strong> ${new Date().toLocaleString('it-IT')}
                    </div>
                </div>
                
                <p>Tieni conto di questa ${modificationType === 'deleted' ? 'rimozione' : 'modifica'} nella pianificazione degli eventi.</p>
                
                <div class="footer">
                    <p>Questa email è stata generata automaticamente da Calendariko.</p>
                    <p>© 2025 Calendariko - Portale Gestione Eventi per Band & DJ</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"Calendariko" <${process.env.EMAIL_USER || 'noreply@calendariko.com'}>`,
    to: to,
    subject: `${actionText[modificationType]} - ${userName} (${formattedDate})`,
    html: htmlContent
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Notifica modifica indisponibilità inviata a ${to.length} destinatari:`, info.messageId);
  } catch (error) {
    console.error(`Errore nell'invio notifica modifica indisponibilità:`, error);
    throw error;
  }
};