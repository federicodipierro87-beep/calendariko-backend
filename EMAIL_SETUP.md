# 📧 Configurazione Email Calendariko

## 🎯 Panoramica
Il sistema email di Calendariko è configurato per inviare notifiche automatiche agli utenti per eventi, richieste di disponibilità e promemoria.

## ⚙️ Configurazione

### 1. Variabili Ambiente (.env)
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
```

### 2. Setup Gmail (Consigliato)

#### Passo 1: Abilitare 2FA
1. Vai su Google Account Settings
2. Attiva la verifica in due passaggi

#### Passo 2: Generare App Password
1. Vai su Google Account > Security > 2-Step Verification
2. Scroll down fino a "App passwords"
3. Genera una password per "Mail"
4. Usa questa password in `EMAIL_PASSWORD`
nhpx mzjq ifmd qzpf

### 3. Setup Alternative (Outlook, Yahoo, etc.)
```env
# Per Outlook
EMAIL_HOST="smtp-mail.outlook.com"
EMAIL_PORT=587

# Per Yahoo
EMAIL_HOST="smtp.mail.yahoo.com"
EMAIL_PORT=587
```

## 🔧 Funzionalità Email

### 1. **Email di Benvenuto** 🎉
- Inviata quando un nuovo utente viene registrato
- Include credenziali temporanee se necessario
- Template: Viola/Purple con guida alle funzionalità

### 2. **Notifiche Nuovi Eventi** 🎤
- Inviata automaticamente quando un admin crea un evento
- Destinatari: Tutti i membri del gruppo (eccetto il creatore)
- Template: Evento con tutti i dettagli (Viola/Purple)

### 3. **Richieste Disponibilità** 📅
- Manuale tramite admin
- Destinatari: Artisti specifici
- Template: Richiesta conferma disponibilità (Verde/Green)

### 4. **Notifiche Indisponibilità** ❌
- Inviata quando un artista segnala indisponibilità
- Destinatari: Admin e membri del gruppo
- Template: Notifica con data e motivo (Rosso/Red)

### 5. **Modifica Eventi** 🔄
- Inviata quando un admin modifica un evento esistente
- Mostra cosa è stato cambiato (data, ora, venue, etc.)
- Template: Arancione/Orange con dettagli delle modifiche

### 6. **Cancellazione Eventi** ❌
- Notifica quando un evento viene cancellato
- Include motivo della cancellazione se specificato
- Template: Rosso/Red con warning box

### 7. **Modifica Gruppi** 🔄
- Inviata quando vengono modificati dettagli del gruppo
- Mostra tipo di modifica (nome, genere, membri, etc.)
- Template: Ciano/Cyan con dettagli cambiamenti

### 8. **Inviti Gruppo** 🎵
- Invito per nuovi membri ad unirsi al gruppo
- Include informazioni sul gruppo e benefici
- Template: Verde/Green con call-to-action

### 9. **Conferme Partecipazione** ✅/❌
- Notifica quando artista conferma/declina evento
- Colori dinamici: Verde per conferma, Rosso per rifiuto
- Include note opzionali dell'artista

### 10. **Reset Password** 🔐
- Link sicuro per reimpostare password
- Scadenza di 1 ora con informazioni sicurezza
- Template: Blu/Blue con istruzioni dettagliate

### 11. **Modifica Indisponibilità** 🔄
- Notifica per creazione/modifica/eliminazione indisponibilità
- Colori dinamici in base al tipo di azione
- Template: Rosso per creazione, Arancione per modifica, Verde per eliminazione

### 12. **Promemoria Eventi** ⏰
- Programmabili per X giorni prima dell'evento
- Destinatari: Partecipanti all'evento
- Template: Arancione/Orange con dettagli evento

### 13. **Email di Test** ✅
- Verificare configurazione sistema
- Disponibile per admin nella dashboard

## 🌐 API Endpoints

### 📋 **Lista Template Disponibili**
#### GET `/api/email/templates`
Ritorna tutti i template email disponibili con parametri richiesti

### 🔍 **Status Configurazione**
#### GET `/api/email/status`
Ritorna lo status della configurazione email

### ✅ **Test Template Base**
#### POST `/api/email/test`
```json
{
  "email": "test@example.com"
}
```

### 🎉 **Test Email Benvenuto**
#### POST `/api/email/test/welcome`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "temporaryPassword": "temp123" // Opzionale
}
```

### 🔄 **Test Modifica Gruppo**
#### POST `/api/email/test/group-modification`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "groupName": "Rock Band",
  "modificationType": "name", // name|description|genre|members
  "oldValue": "Vecchio Nome",
  "newValue": "Nuovo Nome",
  "adminName": "Admin User"
}
```

### 🔄 **Test Modifica Evento**
#### POST `/api/email/test/event-modification`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "eventTitle": "Concerto Rock",
  "eventDate": "2024-12-15T20:00:00Z",
  "groupName": "Rock Band",
  "modificationType": "date", // date|time|venue|title|notes
  "oldValue": "2024-12-01",
  "newValue": "2024-12-15",
  "adminName": "Admin User"
}
```

### ❌ **Test Cancellazione Evento**
#### POST `/api/email/test/event-deletion`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "eventTitle": "Concerto Cancellato",
  "eventDate": "2024-12-15T20:00:00Z",
  "eventTime": "20:00",
  "venueName": "Live Club",
  "groupName": "Rock Band",
  "deletionReason": "Problemi tecnici", // Opzionale
  "adminName": "Admin User"
}
```

### 🎵 **Test Invito Gruppo**
#### POST `/api/email/test/group-invitation`
```json
{
  "email": "test@example.com",
  "userName": "Nuovo Membro",
  "groupName": "Rock Band",
  "inviterName": "Admin User",
  "groupType": "BAND", // BAND|DJ
  "groupGenre": "Rock" // Opzionale
}
```

### ✅ **Test Conferma Evento**
#### POST `/api/email/test/event-confirmation`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "eventTitle": "Concerto Rock",
  "eventDate": "2024-12-15T20:00:00Z",
  "groupName": "Rock Band",
  "confirmationType": "confirmed", // confirmed|declined
  "notes": "Confermo la mia partecipazione" // Opzionale
}
```

### 🔐 **Test Reset Password**
#### POST `/api/email/test/password-reset`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "resetLink": "https://calendariko.com/reset?token=abc123",
  "expirationTime": "2024-12-15 15:30:00"
}
```

### 🔄 **Test Modifica Indisponibilità**
#### POST `/api/email/test/unavailability-modification`
```json
{
  "email": "test@example.com",
  "userName": "Mario Rossi",
  "date": "2024-12-15T00:00:00Z",
  "groupName": "Rock Band",
  "modificationType": "created", // created|updated|deleted
  "oldNotes": "Vecchie note", // Opzionale
  "newNotes": "Nuove note", // Opzionale
  "adminName": "Admin User" // Opzionale
}
```

## 🎨 Template Email

Tutti i template includono:
- ✅ Design responsive
- ✅ Branding Calendariko
- ✅ Colori tematici per tipo email
- ✅ Informazioni complete
- ✅ Footer con disclaimer

### Colori per Tipo:
- 🟣 **Benvenuto & Eventi**: Viola/Purple (#8b5cf6, #667eea)
- 🟢 **Disponibilità & Inviti**: Verde/Green (#10b981, #059669)
- 🔴 **Indisponibilità & Cancellazioni**: Rosso/Red (#ef4444, #dc2626)
- 🟡 **Modifiche & Promemoria**: Arancione/Orange (#f59e0b, #d97706)
- 🔵 **Test & Reset Password**: Blu/Blue (#3b82f6, #6366f1)
- 🟦 **Modifiche Gruppo**: Ciano/Cyan (#06b6d4, #0891b2)
- 🟢/🔴 **Conferme**: Verde/Rosso dinamico (#10b981/#ef4444)

## 🔐 Sicurezza

- ✅ Non loggare password email
- ✅ Usare App Password, non password principale
- ✅ Emails inviate come "noreply@calendariko.com"
- ✅ Gestione errori senza exposing sensitive data

## 📋 Troubleshooting

### Errore "Invalid login"
- Verifica EMAIL_USER e EMAIL_PASSWORD
- Controlla che 2FA sia attivo
- Rigenera App Password

### Errore "Connection timeout"
- Verifica EMAIL_HOST e EMAIL_PORT
- Controlla firewall/proxy
- Prova con porta 465 (SSL)

### Email non arrivano
- Controlla spam/junk folder
- Verifica indirizzo destinatario
- Controlla log server per errori

## 🧪 Test

```bash
# Test configurazione
curl -X POST http://localhost:3000/api/email/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"email":"test@example.com"}'

# Check status
curl -X GET http://localhost:3000/api/email/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📊 Monitoring

Tutti gli invii email sono loggati:
- ✅ Success: `Email inviata a user@example.com: messageId`
- ❌ Error: `Errore nell'invio email a user@example.com: error`

## 🔄 Future Enhancements

- [ ] Email templates editor
- [ ] Scheduling email reminders
- [ ] Email delivery tracking
- [ ] Bulk email campaigns
- [ ] Custom email templates per gruppo