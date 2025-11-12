import React, { useState, useEffect } from 'react';
import { authApi, groupsApi } from '../utils/api';
import ReCaptcha from '../components/ReCaptcha';

interface SimpleLoginProps {
  onLogin: (user: any, accessToken: string, refreshToken: string) => void;
}

const SimpleLogin: React.FC<SimpleLoginProps> = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [debugLog, setDebugLog] = useState<string[]>([]);


  // Carica i gruppi disponibili quando si passa alla modalità registrazione
  useEffect(() => {
    console.log('🔍 useEffect trigger, isRegisterMode:', isRegisterMode);
    if (isRegisterMode) {
      console.log('🔍 Modalità registrazione - caricando gruppi via API');
      loadGroups();
    }
  }, [isRegisterMode]);

  const loadGroups = async () => {
    try {
      console.log('🔍 Chiamata API gruppi...');
      console.log('🔍 Stato prima della chiamata - groups:', groups.length);
      
      const groupsData = await groupsApi.getPublic();
      console.log('🔍 Dati gruppi ricevuti:', groupsData);
      
      if (Array.isArray(groupsData)) {
        console.log('🔍 Chiamando setGroups...');
        console.log('🔍 FRONTEND LOGIN - Groups received:', groupsData.length, groupsData.map((g: any) => g.id));
        setGroups(groupsData);
        console.log('🔍 setGroups completato');
      } else {
        console.error('❌ Dati gruppi non sono un array:', groupsData);
        console.log('🔍 Chiamando setGroups con array vuoto...');
        setGroups([]);
        console.log('🔍 Chiamando setError...');
        setError('Formato dati gruppi non valido');
      }
    } catch (error) {
      console.error('❌ Errore nel caricamento dei gruppi:', error);
      console.log('🔍 Gestendo errore - chiamando setGroups con array vuoto...');
      setGroups([]);
      console.log('🔍 Chiamando setError per errore...');
      setError('Errore nel caricamento dei gruppi disponibili');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isRegisterMode) {
        // Registrazione
        if (!firstName || !lastName) {
          setError('Nome e cognome sono obbligatori');
          setLoading(false);
          return;
        }
        
        if (!selectedGroup) {
          setError('Seleziona un gruppo');
          setLoading(false);
          return;
        }
        
        // Per la registrazione, reCAPTCHA è sempre richiesto
        if (!recaptchaToken) {
          setError('Completa la verifica reCAPTCHA per registrarti');
          setLoading(false);
          return;
        }
        const response = await authApi.publicRegister({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined,
          selectedGroup: selectedGroup,
          recaptchaToken: recaptchaToken
        });
        
        // Mostra popup di successo più visibile
        alert('✅ ' + response.message);
        setSuccess(response.message);
        // Pulisce il form e passa alla modalità login
        setFirstName('');
        setLastName('');
        setPhone('');
        setPassword('');
        setIsRegisterMode(false);
      } else {
        // Login
        // Se reCAPTCHA è richiesto, verifica che sia presente
        if (showRecaptcha && !recaptchaToken) {
          setError('Completa la verifica reCAPTCHA per continuare');
          setLoading(false);
          return;
        }

        const loginData: any = { email, password };
        if (recaptchaToken) {
          loginData.recaptchaToken = recaptchaToken;
        }

        const data = await authApi.login(loginData);
        onLogin(data.user, data.accessToken, data.refreshToken);
      }
    } catch (err: any) {
      const errorMessage = err.message || (isRegisterMode ? 'Registrazione fallita' : 'Login fallito');
      setError(errorMessage);
      
      // Per il login, controlla se l'errore richiede reCAPTCHA
      if (!isRegisterMode) {
        const newAttempts = loginAttempts + 1;
        
        // Aggiungi al log persistente
        const logEntry = `TENTATIVO ${newAttempts}: ${errorMessage} [${new Date().toLocaleTimeString()}]`;
        setDebugLog(prev => [...prev, logEntry]);
        
        console.log('🔍 LOGIN FAILED - Attempts:', newAttempts, 'Error:', errorMessage);
        
        setLoginAttempts(newAttempts);
        
        // Mostra reCAPTCHA se l'errore lo richiede o dopo 3 tentativi
        if (errorMessage.includes('reCAPTCHA richiesta') || newAttempts >= 3) {
          const recaptchaLogEntry = `>>> ATTIVANDO reCAPTCHA dopo ${newAttempts} tentativi [${new Date().toLocaleTimeString()}]`;
          setDebugLog(prev => [...prev, recaptchaLogEntry]);
          
          console.log('🔍 SHOWING RECAPTCHA - Attempts:', newAttempts);
          setShowRecaptcha(true);
          setRecaptchaToken(null); // Reset del token
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setSelectedGroup('');
    setError('');
    setSuccess('');
    setRecaptchaToken(null);
    setShowRecaptcha(false);
    setLoginAttempts(0);
    setDebugLog([]);
  };

  const toggleMode = () => {
    console.log('🔄 Toggle mode chiamato, isRegisterMode attuale:', isRegisterMode);
    try {
      console.log('🔄 Chiamando clearForm...');
      clearForm();
      console.log('🔄 clearForm completato');
      
      console.log('🔄 Cambiando isRegisterMode da', isRegisterMode, 'a', !isRegisterMode);
      setIsRegisterMode(!isRegisterMode);
      console.log('🔄 setIsRegisterMode chiamato');
    } catch (error) {
      console.error('❌ ERRORE in toggleMode:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-4 px-4 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div>
          <h2 className="mt-2 sm:mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            🎵 {isRegisterMode ? 'Registrati su Calendariko' : 'Accedi a Calendariko'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Portale Gestione Eventi per Band & DJ
          </p>
          
          {/* Toggle button molto visibile */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                console.log('🟢 PULSANTE CLICCATO!');
                try {
                  toggleMode();
                } catch (error) {
                  console.error('❌ ERRORE nel toggleMode:', error);
                }
              }}
              className="bg-green-500 text-white px-4 py-2 sm:px-6 rounded-lg font-medium hover:bg-green-600 transition-colors text-sm sm:text-base"
            >
              {isRegisterMode ? '← Torna al Login' : '✨ Crea un nuovo account'}
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit} autoComplete="off">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
          
          <div className="space-y-4">
            {isRegisterMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={isRegisterMode}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="Mario"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                    Cognome *
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={isRegisterMode}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                    placeholder="Rossi"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Indirizzo Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder={isRegisterMode ? "mario.rossi@email.com" : "admin@calendariko.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {isRegisterMode && (
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Telefono (opzionale)
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                  placeholder="+39 123 456 7890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}
            
            {isRegisterMode && (
              <div>
                <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                  Gruppo di appartenenza *
                </label>
                <select
                  id="group"
                  name="group"
                  required={isRegisterMode}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                >
                  <option value="">Seleziona un gruppo...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : group.type === 'SOLO' ? 'Solista' : group.type})
                      {group.genre && ` - ${group.genre}`}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Vedrai solo gli eventi di questo gruppo una volta effettuato l'accesso
                </p>
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder={isRegisterMode ? "Crea una password sicura" : "admin123"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Debug info */}
          <div className="text-xs text-center text-gray-500 mb-2 p-2 border border-gray-300">
            DEBUG: isRegisterMode={isRegisterMode.toString()}, showRecaptcha={showRecaptcha.toString()}, attempts={loginAttempts}
            <br />
            Condition: (isRegisterMode || showRecaptcha) = {(isRegisterMode || showRecaptcha).toString()}
            <br />
            reCAPTCHA token: {recaptchaToken ? 'presente' : 'null'}
          </div>

          {/* Log persistente dei tentativi */}
          {debugLog.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 p-3 mb-4 rounded">
              <h4 className="font-bold text-yellow-800 mb-2">🔍 LOG TENTATIVI LOGIN:</h4>
              {debugLog.map((log, index) => (
                <div key={index} className="text-xs text-yellow-700 mb-1 font-mono">
                  {log}
                </div>
              ))}
            </div>
          )}

          {/* reCAPTCHA: sempre in registrazione, in login solo se richiesto */}
          {(isRegisterMode || showRecaptcha) && (
            <div className="border-2 border-red-500 p-4 bg-red-50">
              <p className="text-red-600 text-sm text-center font-bold mb-2">
                🔍 reCAPTCHA SECTION VISIBLE - Mode: {isRegisterMode ? 'REGISTER' : 'LOGIN'}, showRecaptcha: {showRecaptcha.toString()}
              </p>
              <ReCaptcha 
                onVerify={(token) => {
                  console.log('🔍 reCAPTCHA token received:', token ? 'valid token' : 'null');
                  setRecaptchaToken(token);
                }}
                onExpired={() => {
                  console.log('🔍 reCAPTCHA expired');
                  setRecaptchaToken(null);
                }}
                onError={() => {
                  console.log('🔍 reCAPTCHA error');
                  setRecaptchaToken(null);
                }}
              />
              {isRegisterMode && (
                <p className="mt-2 text-xs text-gray-500 text-center">
                  Verifica di essere umano per completare la registrazione
                </p>
              )}
              {!isRegisterMode && showRecaptcha && (
                <p className="mt-2 text-xs text-orange-600 text-center">
                  ⚠️ Verifica reCAPTCHA richiesta a causa di tentativi di accesso falliti
                </p>
              )}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || (isRegisterMode && !recaptchaToken) || (showRecaptcha && !recaptchaToken)}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading 
                ? (isRegisterMode ? 'Registrazione in corso...' : 'Accesso in corso...') 
                : (isRegisterMode ? 'Registrati' : 'Accedi')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleLogin;