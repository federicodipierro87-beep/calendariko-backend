import React, { useState } from 'react';
import { authApi } from '../utils/api';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [showRecaptcha, setShowRecaptcha] = useState(() => {
    const saved = localStorage.getItem('show_recaptcha');
    return saved === 'true';
  });
  const [loginAttempts, setLoginAttempts] = useState(() => {
    const saved = localStorage.getItem('login_attempts');
    return saved ? parseInt(saved) : 0;
  });



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Previene ulteriori eventi
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
        
        // Login completato con successo
        onLogin(data.user, data.accessToken, data.refreshToken);
      }
    } catch (err: any) {
      const errorMessage = err.message || (isRegisterMode ? 'Registrazione fallita' : 'Login fallito');
      setError(errorMessage);
      
      // Per il login, controlla se l'errore richiede reCAPTCHA
      if (!isRegisterMode) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Mostra reCAPTCHA se l'errore lo richiede o dopo 3 tentativi
        if (errorMessage.includes('reCAPTCHA richiesta') || newAttempts >= 3) {
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
    setError('');
    setSuccess('');
    setRecaptchaToken(null);
    setShowRecaptcha(false);
    setLoginAttempts(0);
  };

  const toggleMode = () => {
    clearForm();
    setIsRegisterMode(!isRegisterMode);
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
              onClick={toggleMode}
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
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Nota:</strong> Dopo la registrazione, un amministratore ti assegnerà al gruppo appropriato.
                  Riceverai una notifica via email quando il tuo account sarà attivato.
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


          {/* reCAPTCHA: sempre in registrazione, in login solo se richiesto */}
          {(isRegisterMode || showRecaptcha) && (
            <div>
              <ReCaptcha 
                onVerify={(token) => setRecaptchaToken(token)}
                onExpired={() => setRecaptchaToken(null)}
                onError={() => setRecaptchaToken(null)}
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