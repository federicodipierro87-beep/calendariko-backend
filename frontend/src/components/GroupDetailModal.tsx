import React, { useState, useEffect } from 'react';
import { groupsApi, usersApi } from '../utils/api';

interface GroupDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: any;
  currentUser: any;
  onGroupUpdated: () => void;
}

const GroupDetailModal: React.FC<GroupDetailModalProps> = ({
  isOpen,
  onClose,
  group,
  currentUser,
  onGroupUpdated
}) => {
  const [members, setMembers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUserMember, setIsUserMember] = useState(false);

  useEffect(() => {
    if (isOpen && group) {
      loadGroupDetails();
    }
  }, [isOpen, group]);

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      // Carica i dettagli del gruppo con i membri
      const groupDetails = await groupsApi.getById(group.id);
      const groupMembers = groupDetails.user_groups?.map((ug: any) => ug.user) || [];
      setMembers(groupMembers);
      
      // Controlla se l'utente corrente è membro
      const userIsMember = groupMembers.some((member: any) => member.id === currentUser.id);
      setIsUserMember(userIsMember);

      // Se admin, carica tutti gli utenti per gestione membri
      if (currentUser.role === 'ADMIN') {
        const users = await usersApi.getAll();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Errore nel caricamento dei dettagli del gruppo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async () => {
    try {
      await groupsApi.joinGroup(group.id);
      await loadGroupDetails();
      onGroupUpdated();
      alert('✅ Ti sei unito al gruppo con successo!');
    } catch (error: any) {
      console.error('Errore nell\'unirsi al gruppo:', error);
      alert(`Errore: ${error.message}`);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Sei sicuro di voler lasciare questo gruppo?')) {
      return;
    }

    try {
      await groupsApi.leaveGroup(group.id);
      await loadGroupDetails();
      onGroupUpdated();
      alert('✅ Hai lasciato il gruppo con successo.');
    } catch (error: any) {
      console.error('Errore nel lasciare il gruppo:', error);
      alert(`Errore: ${error.message}`);
    }
  };

  const handleAddMember = async (userId: string) => {
    console.log('🔍 handleAddMember chiamato con userId:', userId);
    console.log('🔍 group.id:', group.id);
    
    if (!userId) {
      alert('Errore: userId non valido');
      return;
    }
    
    try {
      await groupsApi.addMember(group.id, userId);
      await loadGroupDetails();
      onGroupUpdated();
      alert('✅ Membro aggiunto con successo!');
    } catch (error: any) {
      console.error('Errore nell\'aggiungere il membro:', error);
      alert(`Errore: ${error.message}`);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Sei sicuro di voler rimuovere questo membro dal gruppo?')) {
      return;
    }

    try {
      await groupsApi.removeMember(group.id, userId);
      await loadGroupDetails();
      onGroupUpdated();
      alert('✅ Membro rimosso con successo.');
    } catch (error: any) {
      console.error('Errore nella rimozione del membro:', error);
      alert(`Errore: ${error.message}`);
    }
  };

  if (!isOpen || !group) return null;

  const canManageMembers = currentUser.role === 'ADMIN';
  const nonMembers = allUsers.filter(user => 
    !members.some(member => member.id === user.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            👥 {group.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Informazioni del gruppo */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs ${
              group.type === 'BAND' ? 'bg-purple-100 text-purple-700' :
              group.type === 'DJ' ? 'bg-blue-100 text-blue-700' :
              'bg-green-100 text-green-700'
            }`}>
              {group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'}
            </span>
            {group.genre && <span className="text-sm text-gray-600">• {group.genre}</span>}
          </div>
          {group.description && (
            <p className="text-sm text-gray-700">{group.description}</p>
          )}
        </div>

        {/* Azioni utente */}
        {!canManageMembers && (
          <div className="mb-6">
            {isUserMember ? (
              <button
                onClick={handleLeaveGroup}
                className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
              >
                🚪 Lascia Gruppo
              </button>
            ) : (
              <button
                onClick={handleJoinGroup}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
              >
                ➕ Unisciti al Gruppo
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-4">Caricamento...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista membri attuali */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Membri Attuali ({members.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="bg-gray-50 p-3 rounded text-center text-gray-500">
                    Nessun membro nel gruppo
                  </div>
                ) : (
                  members.map((member) => (
                    <div key={member.id} className="bg-white border rounded p-3 flex justify-between items-center">
                      <div>
                        <div className="font-medium">{member.first_name} {member.last_name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                        <div className="text-xs text-gray-500">
                          {member.role} {member.id === currentUser.id && '(Tu)'}
                        </div>
                      </div>
                      {canManageMembers && member.id !== currentUser.id && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Lista utenti da aggiungere (solo per admin) */}
            {canManageMembers && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">
                  Aggiungi Membri ({nonMembers.length} disponibili)
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nonMembers.length === 0 ? (
                    <div className="bg-gray-50 p-3 rounded text-center text-gray-500">
                      Tutti gli utenti sono già membri
                    </div>
                  ) : (
                    nonMembers.map((user) => (
                      <div key={user.id} className="bg-gray-50 border rounded p-3 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.role}</div>
                        </div>
                        <button
                          onClick={() => handleAddMember(user.id)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                        >
                          Aggiungi
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupDetailModal;