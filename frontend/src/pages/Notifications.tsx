import React, { useState, useEffect } from 'react';
import { notificationsApi, groupsApi, usersApi } from '../utils/api';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

interface NotificationsProps {
  onNotificationsChange?: () => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onNotificationsChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groups, setGroups] = useState<any[]>([]);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);
  const [usersWithGroups, setUsersWithGroups] = useState<Set<string>>(new Set());

  // Use body scroll lock when modal is open
  useBodyScrollLock(showAssignModal);

  useEffect(() => {
    loadNotifications();
    loadGroups();
    loadUsersWithGroups();
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

  const loadUsersWithGroups = async () => {
    try {
      const groupsData = await groupsApi.getAll();
      const usersInGroups = new Set<string>();
      
      groupsData.forEach((group: any) => {
        if (group.user_groups) {
          group.user_groups.forEach((userGroup: any) => {
            usersInGroups.add(userGroup.user_id);
          });
        }
      });
      
      setUsersWithGroups(usersInGroups);
    } catch (error) {
      console.error('Error loading users with groups:', error);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      // Aggiorna il contatore nel Dashboard
      onNotificationsChange?.();
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
      // Aggiorna il contatore nel Dashboard
      onNotificationsChange?.();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa notifica?')) return;

    try {
      await notificationsApi.delete(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      // Aggiorna il contatore nel Dashboard
      onNotificationsChange?.();
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
      
      // Ricarica le notifiche e la lista degli utenti con gruppi
      await Promise.all([
        loadNotifications(),
        loadUsersWithGroups()
      ]);
      
      // Aggiorna il contatore nel Dashboard (importante: la notifica è stata marcata come letta dal backend)
      onNotificationsChange?.();
      
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
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">📧 Notifiche</h1>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm sm:text-base"
          >
            ✅ Segna tutte come lette
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
              {/* Mobile-first layout */}
              <div className="space-y-4">
                {/* Header della notifica */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-gray-900 text-base sm:text-lg flex-1 min-w-0">
                      {notification.title}
                    </h3>
                    {!notification.is_read && (
                      <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        🆕 Nuovo
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    📅 {formatDate(notification.created_at)}
                  </p>
                </div>

                {/* Azioni della notifica */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                  {notification.type === 'NEW_USER_REGISTRATION' && notification.data?.newUserId && (
                    <>
                      {usersWithGroups.has(notification.data.newUserId) ? (
                        <span className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                          ✅ Utente già assegnato a un gruppo
                        </span>
                      ) : (
                        <button
                          onClick={() => openAssignModal(notification)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
                        >
                          👥 Assegna a gruppo
                        </button>
                      )}
                    </>
                  )}
                  
                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-1 sm:flex-none px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        ✓ Letta
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteNotification(notification.id)}
                      className="flex-1 sm:flex-none px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      🗑️ Elimina
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal per assegnazione gruppo */}
      {showAssignModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-medium text-gray-900 pr-8">
                👥 Assegnazione Gruppo
              </h3>
              
              {/* Informazioni utente */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-blue-900">
                    {selectedUser.first_name} {selectedUser.last_name}
                  </h4>
                  <p className="text-sm text-blue-700">
                    📧 {selectedUser.email}
                  </p>
                  {selectedUser.phone && (
                    <p className="text-sm text-blue-700">
                      📱 {selectedUser.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Selezione gruppo */}
              <div className="space-y-2">
                <label htmlFor="group" className="block text-sm font-medium text-gray-700">
                  Seleziona gruppo di destinazione:
                </label>
                <select
                  id="group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                >
                  <option value="">💫 Seleziona un gruppo...</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : group.type === 'SOLO' ? 'Solista' : group.type})
                      {group.genre && ` - ${group.genre}`}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p className="text-sm text-red-600">
                    ⚠️ Nessun gruppo disponibile. Crea prima un gruppo.
                  </p>
                )}
              </div>

              {/* Pulsanti di azione */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedUser(null);
                    setSelectedGroupId('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  ❌ Annulla
                </button>
                <button
                  onClick={handleAssignToGroup}
                  disabled={!selectedGroupId || assigning}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {assigning ? '⏳ Assegnazione...' : '✅ Assegna al gruppo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;