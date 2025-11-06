import React, { useState, useEffect } from 'react';
import { authApi, groupsApi } from '../utils/api';

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

  // Carica i gruppi disponibili quando si passa alla modalità registrazione
  useEffect(() => {
    console.log('🔍 useEffect trigger, isRegisterMode:', isRegisterMode);
    if (isRegisterMode) {
      console.log('🔍 Modalità registrazione - usando gruppi reali hardcoded temporanei');
      // Gruppi reali dal database con ID corretti - hardcoded finché non risolviamo l'API
      const tempGroups = [
        { id: 'cmhlbg6m40003v2f89s12j62a', name: 'Jazz Quartet Milano', type: 'BAND', genre: 'Jazz' },
        { id: 'cmhlbg6lr0001v2f8q4n4owyt', name: 'DJ Marco Electronic', type: 'DJ', genre: 'Electronic' },
        { id: 'cmhlbg6jh0000v2f80keyvnen', name: 'Sofia Vocal', type: 'SOLO', genre: 'Pop/Soul' },
        { id: 'cmhlbg6m00002v2f8btnpwaot', name: 'Rock Band Thunder', type: 'BAND', genre: 'Rock' },
        { id: 'cmhlbg6m60004v2f8o3e309gy', name: 'DJ Luna House', type: 'DJ', genre: 'House' },
        { id: 'cmhlbn0hl0000v2n8u5qbsp4x', name: 'tribal sound', type: 'BAND', genre: 'commerciale' }
      ];
      setGroups(tempGroups);
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
        
        const response = await authApi.publicRegister({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone: phone || undefined,
          selectedGroup: selectedGroup
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
        const data = await authApi.login({ email, password });
        onLogin(data.user, data.accessToken, data.refreshToken);
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
    setSelectedGroup('');
    setError('');
    setSuccess('');
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
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
              className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-600 transition-colors"
            >
              {isRegisterMode ? '← Torna al Login' : '✨ Crea un nuovo account'}
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
          
          <div className="space-y-4">
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required={isRegisterMode}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={isRegisterMode ? "Crea una password sicura" : "admin123"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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