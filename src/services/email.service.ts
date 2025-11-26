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
}

export class EmailService {
  private static readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@calendariko.com';
  private static readonly APP_NAME = 'Calendariko';

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
            </div>
            
            <p>Accedi alla piattaforma per visualizzare tutti i dettagli e gestire la tua agenda.</p>
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

Accedi alla piattaforma ${this.APP_NAME} per visualizzare tutti i dettagli.
    `;

    await this.sendEmail({
      to: emails,
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
    `;

    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }
}