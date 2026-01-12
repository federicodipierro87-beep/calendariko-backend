// Import compatible con CommonJS
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
}

export interface EventNotificationData {
  eventTitle: string;
  eventDescription?: string;
  eventLocation?: string;
  startTime: Date;
  endTime: Date;
  groupName?: string;
  organizerName?: string;
  fee?: number;
  contactResponsible?: string;
  notes?: string;
}

export class EmailService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@easysolution-dp.com';
  private static readonly APP_NAME = 'Calendariko';
  private static readonly APP_URL = process.env.FRONTEND_URL || 'https://calendariko.netlify.app';

  // Stile del pulsante CTA per le email
  private static readonly CTA_BUTTON_STYLE = `
    display: inline-block;
    background: #4f46e5;
    color: white !important;
    padding: 12px 24px;
    border-radius: 6px;
    text-decoration: none;
    font-weight: bold;
    margin: 20px 0;
  `;

  // Genera il blocco HTML del pulsante per accedere al calendario
  private static getCalendarButtonHtml(): string {
    return `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${this.APP_URL}" style="${this.CTA_BUTTON_STYLE}">
          📅 Vai al Calendario
        </a>
      </div>
    `;
  }

  // Genera il testo per la versione plain text delle email
  private static getCalendarButtonText(): string {
    return `\n📅 Vai al Calendario: ${this.APP_URL}\n`;
  }

  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      console.log('📧 Sending email to:', options.to);
      console.log('📧 Subject:', options.subject);
      console.log('📧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
      console.log('📧 FROM_EMAIL:', process.env.FROM_EMAIL || 'using default');

      if (!process.env.RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY not configured, email sending disabled');
        return;
      }

      const result = await resend.emails.send({
        from: options.from || this.FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html || options.text,
        text: options.text
      });

      console.log('✅ Email sent successfully:', result);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw new Error(`Email sending failed: ${error}`);
    }
  }

  static async sendEventNotification(
    emails: string[],
    eventData: EventNotificationData
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      });
    };

    const subject = `🎵 Nuovo Evento: ${eventData.eventTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .event-title { font-size: 24px; font-weight: bold; color: #4f46e5; margin-bottom: 10px; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 ${this.APP_NAME}</h1>
            <p>Nuovo evento creato nel tuo calendario</p>
          </div>
          
          <div class="content">
            <div class="event-details">
              <div class="event-title">${eventData.eventTitle}</div>
              
              ${eventData.eventDescription ? `
                <div class="detail-row">
                  <span class="detail-label">Descrizione:</span> ${eventData.eventDescription}
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Inizio:</span> ${formatDate(eventData.startTime)}
              </div>
              
              <div class="detail-row">
                <span class="detail-label">🕐 Fine:</span> ${formatDate(eventData.endTime)}
              </div>
              
              ${eventData.eventLocation ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Luogo:</span> ${eventData.eventLocation}
                </div>
              ` : ''}
              
              ${eventData.groupName ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Gruppo:</span> ${eventData.groupName}
                </div>
              ` : ''}
              
              ${eventData.organizerName ? `
                <div class="detail-row">
                  <span class="detail-label">👤 Organizzatore:</span> ${eventData.organizerName}
                </div>
              ` : ''}
              
              ${eventData.fee !== undefined && eventData.fee !== null ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Cachet:</span> €${eventData.fee}
                </div>
              ` : ''}
              
              ${eventData.contactResponsible ? `
                <div class="detail-row">
                  <span class="detail-label">📞 Contatto responsabile:</span> ${eventData.contactResponsible}
                </div>
              ` : ''}
              
              ${eventData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note:</span> ${eventData.notes}
                </div>
              ` : ''}
            </div>
            
            <p>Accedi alla piattaforma per visualizzare tutti i dettagli e gestire la tua agenda.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🎵 NUOVO EVENTO: ${eventData.eventTitle}

${eventData.eventDescription ? `Descrizione: ${eventData.eventDescription}\n` : ''}
📅 Inizio: ${formatDate(eventData.startTime)}
🕐 Fine: ${formatDate(eventData.endTime)}
${eventData.eventLocation ? `📍 Luogo: ${eventData.eventLocation}\n` : ''}
${eventData.groupName ? `👥 Gruppo: ${eventData.groupName}\n` : ''}
${eventData.organizerName ? `👤 Organizzatore: ${eventData.organizerName}\n` : ''}
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }

  static async sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<void> {
    const backendUrl = process.env.BACKEND_URL || 'https://calendariko-backend-production.up.railway.app';
    const verificationUrl = `${backendUrl}/api/auth/verify/${verificationToken}`;
    
    const subject = `Conferma registrazione ${this.APP_NAME}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .verification-box { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #4f46e5; }
          .verify-link { color: #4f46e5; text-decoration: underline; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .note { background: #f3f4f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 ${this.APP_NAME}</h1>
            <p>Conferma la tua registrazione</p>
          </div>
          
          <div class="content">
            <div class="verification-box">
              <h2>Ciao ${firstName},</h2>
              
              <p>Grazie per esserti registrato su Calendariko, la piattaforma di gestione eventi per band e DJ.</p>
              
              <p>Per completare la registrazione, clicca sul seguente link:</p>
              
              <p><a href="${verificationUrl}" class="verify-link">Conferma registrazione</a></p>
              
              <p>Dopo la conferma, un amministratore ti assegnerà al gruppo appropriato.</p>
            </div>
            
            <div class="note">
              <p><strong>Nota:</strong> Questo link scade tra 24 ore.</p>
              <p>Se non hai richiesto questa registrazione, ignora questa email.</p>
            </div>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>© 2024 ${this.APP_NAME} - Gestione Eventi per Musicisti</p>
            <p>Questa email è stata inviata automaticamente dal sistema</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
${this.APP_NAME} - Conferma registrazione

Ciao ${firstName},

Grazie per esserti registrato su Calendariko, la piattaforma di gestione eventi per band e DJ.

Per completare la registrazione, clicca sul seguente link:
${verificationUrl}

Dopo la conferma, un amministratore ti assegnerà al gruppo appropriato.

Nota: Questo link scade tra 24 ore.
Se non hai richiesto questa registrazione, ignora questa email.
${this.getCalendarButtonText()}
© 2024 ${this.APP_NAME} - Gestione Eventi per Musicisti
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const subject = `Benvenuto in ${this.APP_NAME}! 🎵`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎵 Benvenuto in ${this.APP_NAME}!</h1>
          </div>
          
          <div class="content">
            <h2>Ciao ${firstName}! 👋</h2>
            <p>Benvenuto nella piattaforma di gestione eventi per band e DJ!</p>
            <p>Un amministratore ti assegnerà presto al gruppo appropriato.</p>
            <p>Riceverai una notifica via email quando il tuo account sarà attivo e potrai iniziare a usare tutte le funzionalità della piattaforma.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🎵 Benvenuto in ${this.APP_NAME}!

Ciao ${firstName}!

Benvenuto nella piattaforma di gestione eventi per band e DJ!
Un amministratore ti assegnerà presto al gruppo appropriato.
Riceverai una notifica via email quando il tuo account sarà attivo.
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  static async sendEventUpdateNotification(
    emails: string[],
    eventData: EventNotificationData
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      });
    };

    const subject = `📝 Evento Modificato: ${eventData.eventTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .event-title { font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .update-notice { background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 ${this.APP_NAME}</h1>
            <p>Evento modificato nel tuo calendario</p>
          </div>
          
          <div class="content">
            <div class="update-notice">
              <strong>⚠️ IMPORTANTE:</strong> Questo evento è stato modificato. Verifica i nuovi dettagli qui sotto.
            </div>
            
            <div class="event-details">
              <div class="event-title">${eventData.eventTitle}</div>
              
              ${eventData.eventDescription ? `
                <div class="detail-row">
                  <span class="detail-label">Descrizione:</span> ${eventData.eventDescription}
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Inizio:</span> ${formatDate(eventData.startTime)}
              </div>
              
              <div class="detail-row">
                <span class="detail-label">🕐 Fine:</span> ${formatDate(eventData.endTime)}
              </div>
              
              ${eventData.eventLocation ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Luogo:</span> ${eventData.eventLocation}
                </div>
              ` : ''}
              
              ${eventData.groupName ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Gruppo:</span> ${eventData.groupName}
                </div>
              ` : ''}
              
              ${eventData.organizerName ? `
                <div class="detail-row">
                  <span class="detail-label">👤 Organizzatore:</span> ${eventData.organizerName}
                </div>
              ` : ''}
              
              ${eventData.fee !== undefined && eventData.fee !== null ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Cachet:</span> €${eventData.fee}
                </div>
              ` : ''}
              
              ${eventData.contactResponsible ? `
                <div class="detail-row">
                  <span class="detail-label">📞 Contatto responsabile:</span> ${eventData.contactResponsible}
                </div>
              ` : ''}
              
              ${eventData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note:</span> ${eventData.notes}
                </div>
              ` : ''}
            </div>
            
            <p>Accedi alla piattaforma per visualizzare tutti i dettagli aggiornati.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
📝 EVENTO MODIFICATO: ${eventData.eventTitle}

⚠️ IMPORTANTE: Questo evento è stato modificato. Verifica i nuovi dettagli qui sotto.

${eventData.eventDescription ? `Descrizione: ${eventData.eventDescription}\\n` : ''}
📅 Inizio: ${formatDate(eventData.startTime)}
🕐 Fine: ${formatDate(eventData.endTime)}
${eventData.eventLocation ? `📍 Luogo: ${eventData.eventLocation}\\n` : ''}
${eventData.groupName ? `👥 Gruppo: ${eventData.groupName}\\n` : ''}
${eventData.organizerName ? `👤 Organizzatore: ${eventData.organizerName}\\n` : ''}
${eventData.fee !== undefined && eventData.fee !== null ? `💰 Cachet: €${eventData.fee}\\n` : ''}
${eventData.contactResponsible ? `📞 Contatto responsabile: ${eventData.contactResponsible}\\n` : ''}
${eventData.notes ? `📝 Note: ${eventData.notes}\\n` : ''}
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }

  static async sendEventDeleteNotification(
    emails: string[],
    eventData: EventNotificationData
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      });
    };

    const subject = `🗑️ Evento Cancellato: ${eventData.eventTitle}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .event-title { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px; text-decoration: line-through; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .cancel-notice { background: #fecaca; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗑️ ${this.APP_NAME}</h1>
            <p>Evento cancellato dal tuo calendario</p>
          </div>
          
          <div class="content">
            <div class="cancel-notice">
              <strong>❌ CANCELLATO:</strong> Questo evento è stato eliminato dal calendario.
            </div>
            
            <div class="event-details">
              <div class="event-title">${eventData.eventTitle}</div>
              
              ${eventData.eventDescription ? `
                <div class="detail-row">
                  <span class="detail-label">Descrizione:</span> ${eventData.eventDescription}
                </div>
              ` : ''}
              
              <div class="detail-row">
                <span class="detail-label">📅 Era previsto per:</span> ${formatDate(eventData.startTime)} - ${formatDate(eventData.endTime)}
              </div>
              
              ${eventData.eventLocation ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Luogo:</span> ${eventData.eventLocation}
                </div>
              ` : ''}
              
              ${eventData.groupName ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Gruppo:</span> ${eventData.groupName}
                </div>
              ` : ''}
              
              ${eventData.organizerName ? `
                <div class="detail-row">
                  <span class="detail-label">👤 Organizzatore:</span> ${eventData.organizerName}
                </div>
              ` : ''}
              
              ${eventData.fee !== undefined && eventData.fee !== null ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Cachet:</span> €${eventData.fee}
                </div>
              ` : ''}
              
              ${eventData.contactResponsible ? `
                <div class="detail-row">
                  <span class="detail-label">📞 Contatto responsabile:</span> ${eventData.contactResponsible}
                </div>
              ` : ''}
              
              ${eventData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note:</span> ${eventData.notes}
                </div>
              ` : ''}
            </div>
            
            <p>Se hai domande sulla cancellazione di questo evento, contatta l'organizzatore.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🗑️ EVENTO CANCELLATO: ${eventData.eventTitle}

❌ CANCELLATO: Questo evento è stato eliminato dal calendario.

${eventData.eventDescription ? `Descrizione: ${eventData.eventDescription}\\n` : ''}
📅 Era previsto per: ${formatDate(eventData.startTime)} - ${formatDate(eventData.endTime)}
${eventData.eventLocation ? `📍 Luogo: ${eventData.eventLocation}\\n` : ''}
${eventData.groupName ? `👥 Gruppo: ${eventData.groupName}\\n` : ''}
${eventData.organizerName ? `👤 Organizzatore: ${eventData.organizerName}\\n` : ''}
${eventData.fee !== undefined && eventData.fee !== null ? `💰 Cachet: €${eventData.fee}\\n` : ''}
${eventData.contactResponsible ? `📞 Contatto responsabile: ${eventData.contactResponsible}\\n` : ''}
${eventData.notes ? `📝 Note: ${eventData.notes}\\n` : ''}

Se hai domande sulla cancellazione di questo evento, contatta l'organizzatore.
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }

  static async sendAvailabilityDeleteNotification(
    emails: string[],
    groupName: string,
    date: Date,
    adminName: string,
    notes?: string
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const subject = `🗑️ Indisponibilità Rimossa: ${groupName} - ${formatDate(date)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .availability-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .availability-title { font-size: 20px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .cancel-notice { background: #fecaca; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #dc2626; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🗑️ ${this.APP_NAME}</h1>
            <p>Indisponibilità rimossa dal calendario</p>
          </div>
          
          <div class="content">
            <div class="cancel-notice">
              <strong>📢 NOTIFICA:</strong> Un amministratore ha rimosso un'indisponibilità dal vostro calendario.
            </div>
            
            <div class="availability-details">
              <div class="availability-title">Indisponibilità Rimossa</div>
              
              <div class="detail-row">
                <span class="detail-label">👥 Gruppo:</span> ${groupName}
              </div>
              
              <div class="detail-row">
                <span class="detail-label">📅 Data:</span> ${formatDate(date)}
              </div>
              
              <div class="detail-row">
                <span class="detail-label">👤 Rimossa da:</span> ${adminName} (Amministratore)
              </div>
              
              ${notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note originali:</span> ${notes}
                </div>
              ` : ''}
            </div>
            
            <p>La data è ora nuovamente disponibile per eventi. Se avete domande su questa modifica, contattate l'amministratore.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🗑️ INDISPONIBILITÀ RIMOSSA: ${groupName} - ${formatDate(date)}

📢 NOTIFICA: Un amministratore ha rimosso un'indisponibilità dal vostro calendario.

👥 Gruppo: ${groupName}
📅 Data: ${formatDate(date)}
👤 Rimossa da: ${adminName} (Amministratore)
${notes ? `📝 Note originali: ${notes}` : ''}

La data è ora nuovamente disponibile per eventi.
Se avete domande su questa modifica, contattate l'amministratore.
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }

  static async sendEventConfirmationEmail(
    emails: string[],
    eventData: EventNotificationData
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      });
    };

    const subject = `✅ Data Confermata: ${eventData.eventTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .event-title { font-size: 24px; font-weight: bold; color: #16a34a; margin-bottom: 10px; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .confirm-notice { background: #dcfce7; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #16a34a; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ ${this.APP_NAME}</h1>
            <p>La data è stata confermata!</p>
          </div>

          <div class="content">
            <div class="confirm-notice">
              <strong>🎉 CONFERMATO:</strong> Questo evento è stato confermato. Segna la data sul calendario!
            </div>

            <div class="event-details">
              <div class="event-title">${eventData.eventTitle}</div>

              ${eventData.eventDescription ? `
                <div class="detail-row">
                  <span class="detail-label">Descrizione:</span> ${eventData.eventDescription}
                </div>
              ` : ''}

              <div class="detail-row">
                <span class="detail-label">📅 Inizio:</span> ${formatDate(eventData.startTime)}
              </div>

              <div class="detail-row">
                <span class="detail-label">🕐 Fine:</span> ${formatDate(eventData.endTime)}
              </div>

              ${eventData.eventLocation ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Luogo:</span> ${eventData.eventLocation}
                </div>
              ` : ''}

              ${eventData.groupName ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Gruppo:</span> ${eventData.groupName}
                </div>
              ` : ''}

              ${eventData.organizerName ? `
                <div class="detail-row">
                  <span class="detail-label">👤 Organizzatore:</span> ${eventData.organizerName}
                </div>
              ` : ''}

              ${eventData.fee !== undefined && eventData.fee !== null ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Cachet:</span> €${eventData.fee}
                </div>
              ` : ''}

              ${eventData.contactResponsible ? `
                <div class="detail-row">
                  <span class="detail-label">📞 Contatto responsabile:</span> ${eventData.contactResponsible}
                </div>
              ` : ''}

              ${eventData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note:</span> ${eventData.notes}
                </div>
              ` : ''}
            </div>

            <p>La data è ora confermata. Accedi alla piattaforma per tutti i dettagli.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
✅ DATA CONFERMATA: ${eventData.eventTitle}

🎉 CONFERMATO: Questo evento è stato confermato. Segna la data sul calendario!

${eventData.eventDescription ? `Descrizione: ${eventData.eventDescription}\n` : ''}
📅 Inizio: ${formatDate(eventData.startTime)}
🕐 Fine: ${formatDate(eventData.endTime)}
${eventData.eventLocation ? `📍 Luogo: ${eventData.eventLocation}\n` : ''}
${eventData.groupName ? `👥 Gruppo: ${eventData.groupName}\n` : ''}
${eventData.organizerName ? `👤 Organizzatore: ${eventData.organizerName}\n` : ''}
${eventData.fee !== undefined && eventData.fee !== null ? `💰 Cachet: €${eventData.fee}\n` : ''}
${eventData.contactResponsible ? `📞 Contatto responsabile: ${eventData.contactResponsible}\n` : ''}
${eventData.notes ? `📝 Note: ${eventData.notes}\n` : ''}

La data è ora confermata!
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }

  static async sendEventBackToOptionedEmail(
    emails: string[],
    eventData: EventNotificationData
  ): Promise<void> {
    const formatDate = (date: Date): string => {
      return date.toLocaleString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Rome'
      });
    };

    const subject = `⚠️ Data Tornata Opzionata: ${eventData.eventTitle}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .event-details { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .event-title { font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
          .detail-row { margin: 8px 0; }
          .detail-label { font-weight: bold; color: #6b7280; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .optioned-notice { background: #fef3c7; padding: 10px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ ${this.APP_NAME}</h1>
            <p>La data è tornata opzionata</p>
          </div>

          <div class="content">
            <div class="optioned-notice">
              <strong>📋 ATTENZIONE:</strong> Questo evento è tornato allo stato "opzionato" ed è in attesa di conferma definitiva.
            </div>

            <div class="event-details">
              <div class="event-title">${eventData.eventTitle}</div>

              ${eventData.eventDescription ? `
                <div class="detail-row">
                  <span class="detail-label">Descrizione:</span> ${eventData.eventDescription}
                </div>
              ` : ''}

              <div class="detail-row">
                <span class="detail-label">📅 Inizio:</span> ${formatDate(eventData.startTime)}
              </div>

              <div class="detail-row">
                <span class="detail-label">🕐 Fine:</span> ${formatDate(eventData.endTime)}
              </div>

              ${eventData.eventLocation ? `
                <div class="detail-row">
                  <span class="detail-label">📍 Luogo:</span> ${eventData.eventLocation}
                </div>
              ` : ''}

              ${eventData.groupName ? `
                <div class="detail-row">
                  <span class="detail-label">👥 Gruppo:</span> ${eventData.groupName}
                </div>
              ` : ''}

              ${eventData.organizerName ? `
                <div class="detail-row">
                  <span class="detail-label">👤 Organizzatore:</span> ${eventData.organizerName}
                </div>
              ` : ''}

              ${eventData.fee !== undefined && eventData.fee !== null ? `
                <div class="detail-row">
                  <span class="detail-label">💰 Cachet:</span> €${eventData.fee}
                </div>
              ` : ''}

              ${eventData.contactResponsible ? `
                <div class="detail-row">
                  <span class="detail-label">📞 Contatto responsabile:</span> ${eventData.contactResponsible}
                </div>
              ` : ''}

              ${eventData.notes ? `
                <div class="detail-row">
                  <span class="detail-label">📝 Note:</span> ${eventData.notes}
                </div>
              ` : ''}
            </div>

            <p>La data non è più confermata e richiede una nuova conferma. Accedi alla piattaforma per i dettagli.</p>

            ${this.getCalendarButtonHtml()}
          </div>

          <div class="footer">
            <p>Questa email è stata inviata automaticamente da ${this.APP_NAME}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
⚠️ DATA TORNATA OPZIONATA: ${eventData.eventTitle}

📋 ATTENZIONE: Questo evento è tornato allo stato "opzionato" ed è in attesa di conferma definitiva.

${eventData.eventDescription ? `Descrizione: ${eventData.eventDescription}\n` : ''}
📅 Inizio: ${formatDate(eventData.startTime)}
🕐 Fine: ${formatDate(eventData.endTime)}
${eventData.eventLocation ? `📍 Luogo: ${eventData.eventLocation}\n` : ''}
${eventData.groupName ? `👥 Gruppo: ${eventData.groupName}\n` : ''}
${eventData.organizerName ? `👤 Organizzatore: ${eventData.organizerName}\n` : ''}
${eventData.fee !== undefined && eventData.fee !== null ? `💰 Cachet: €${eventData.fee}\n` : ''}
${eventData.contactResponsible ? `📞 Contatto responsabile: ${eventData.contactResponsible}\n` : ''}
${eventData.notes ? `📝 Note: ${eventData.notes}\n` : ''}

La data non è più confermata e richiede una nuova conferma.
${this.getCalendarButtonText()}
    `;

    await this.sendEmail({
      to: emails,
      subject,
      html,
      text
    });
  }
}