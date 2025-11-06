import React, { useState } from 'react';
import { authApi } from '../services/api';
import { authApi as utilsAuthApi } from '../utils/api';

interface LoginProps {
  onLogin: (user: any, accessToken: string, refreshToken: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        
        const response = await utilsAuthApi.publicRegister({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined
        });
        
        setSuccess(response.message);
        // Pulisce il form e passa alla modalità login
        setFirstName('');
        setLastName('');
        setPhone('');
        setPassword('');
        setIsRegisterMode(false);
      } else {
        // Login
        const response = await authApi.login(email, password);
        onLogin(response.user, response.accessToken, response.refreshToken);
      }
    } catch (err: any) {
      setError(err.message || (isRegisterMode ? 'Registrazione fallita' : 'Login fallito'));
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
  };

  const toggleMode = () => {
    clearForm();
    setIsRegisterMode(!isRegisterMode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* PULSANTE REGISTRAZIONE MOLTO VISIBILE */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleMode}
          className="bg-red-500 text-white px-6 py-3 rounded-lg text-lg font-bold shadow-lg hover:bg-red-600"
          style={{backgroundColor: '#ff0000', color: 'white', fontSize: '18px', padding: '12px 24px'}}
        >
          {isRegisterMode ? 'LOGIN' : 'REGISTRATI QUI!'}
        </button>
      </div>
      
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🎵 {isRegisterMode ? 'Registrati su Calendariko' : 'NUOVO LOGIN Calendariko'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Portale Gestione Eventi per Band & DJ
          </p>
          
          {/* Toggle button in alto per maggiore visibilità */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={toggleMode}
              className="text-sm font-medium text-blue-600 hover:text-blue-500 bg-blue-50 px-4 py-2 rounded-md border border-blue-200"
            >
              {isRegisterMode 
                ? '← Torna al Login' 
                : '✨ Crea un nuovo account'
              }
            </button>
          </div>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
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
          
          <div className="rounded-md shadow-sm space-y-2">
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="firstName" className="sr-only">Nome</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={isRegisterMode}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Nome"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="sr-only">Cognome</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required={isRegisterMode}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Cognome"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            {isRegisterMode && (
              <div>
                <label htmlFor="phone" className="sr-only">Telefono</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Telefono (opzionale)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            )}
            
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegisterMode ? "new-password" : "current-password"}
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (isRegisterMode ? 'Registrazione...' : 'Accesso...') 
                : (isRegisterMode ? 'Registrati' : 'Accedi')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;