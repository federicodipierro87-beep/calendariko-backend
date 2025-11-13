import React, { useState, useEffect } from 'react';
import { notificationsApi, groupsApi, usersApi } from '../utils/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadNotifications();
    loadGroups();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Errore nel caricamento delle notifiche');
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await groupsApi.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa notifica?')) return;

    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const openAssignModal = async (notification: Notification) => {
    if (notification.type === 'NEW_USER_REGISTRATION' && notification.data?.newUserId) {
      try {
        const user = await usersApi.getById(notification.data.newUserId);
        setSelectedUser(user);
        setShowAssignModal(true);
      } catch (error) {
        console.error('Error loading user details:', error);
        alert('Errore nel caricamento dei dettagli utente');
      }
    }
  };

  const handleAssignToGroup = async () => {
    if (!selectedUser || !selectedGroupId) return;

    setAssigning(true);
    try {
      await groupsApi.addMember(selectedGroupId, selectedUser.id);
      
      // Chiudi modal e aggiorna notifiche
      setShowAssignModal(false);
      setSelectedUser(null);
      setSelectedGroupId('');
      
      // Ricarica le notifiche
      await loadNotifications();
      
      alert(`${selectedUser.first_name} ${selectedUser.last_name} è stato aggiunto al gruppo!`);
    } catch (error) {
      console.error('Error assigning user to group:', error);
      alert('Errore nell\'assegnazione al gruppo');
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Caricamento notifiche...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifiche</h1>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Segna tutte come lette
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Nessuna notifica presente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`border rounded-lg p-4 ${
                notification.is_read
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs">
                        Nuovo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{notification.message}</p>
                  <p className="text-sm text-gray-500">
                    {formatDate(notification.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {notification.type === 'NEW_USER_REGISTRATION' && (
                    <button
                      onClick={() => openAssignModal(notification)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                    >
                      Assegna gruppo
                    </button>
                  )}
                  
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                    >
                      Segna come letta
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeleteNotification(notification.id)}
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal per assegnazione gruppo */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">
              Assegna {selectedUser.first_name} {selectedUser.last_name} a un gruppo
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Email: {selectedUser.email}</p>
            </div>

            <div className="mb-4">
              <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
                Seleziona gruppo:
              </label>
              <select
                id="group"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleziona un gruppo...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : group.type === 'SOLO' ? 'Solista' : group.type})
                    {group.genre && ` - ${group.genre}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUser(null);
                  setSelectedGroupId('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleAssignToGroup}
                disabled={!selectedGroupId || assigning}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {assigning ? 'Assegnazione...' : 'Assegna al gruppo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;