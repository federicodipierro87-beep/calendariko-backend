import React, { useState, useEffect } from 'react';
import SimpleLogin from './pages/SimpleLogin';
import Dashboard from './pages/Dashboard';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUserData = localStorage.getItem('userData');
    const accessToken = localStorage.getItem('accessToken');
    
    if (savedUserData && accessToken) {
      try {
        const parsedUser = JSON.parse(savedUserData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.clear();
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (userData: any, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(userData));
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl font-semibold text-gray-900">🎵 Calendariko</div>
          <div className="text-gray-600 mt-2">Caricamento...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SimpleLogin onLogin={handleLogin} />;
  }

  return <Dashboard user={user} />;
}

export default App;
