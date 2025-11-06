import React from 'react';

interface SimpleDashboardProps {
  user: any;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ user }) => {
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🎵 Calendariko - {user.role === 'ADMIN' ? 'Admin' : 'Artist'} Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {user.first_name} {user.last_name}
              </span>
              <button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                🎉 Login Successful!
              </h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h4 className="text-green-800 font-medium">✅ Authentication Working</h4>
                  <p className="text-green-700 text-sm mt-1">JWT authentication is functioning correctly</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-blue-800 font-medium">📊 User Information</h4>
                  <div className="text-blue-700 text-sm mt-2 space-y-1">
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Role:</strong> {user.role}</p>
                    <p><strong>Name:</strong> {user.first_name} {user.last_name}</p>
                  </div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                  <h4 className="text-purple-800 font-medium">🚀 Next Steps</h4>
                  <div className="text-purple-700 text-sm mt-2">
                    <p>Your Calendariko system is ready! Features include:</p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Event management</li>
                      <li>Group coordination</li>
                      <li>Availability tracking</li>
                      <li>Interactive calendar</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleDashboard;