import React, { useState, useEffect } from 'react';
import { availabilityApi } from '../utils/api';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userGroups: any[];
  onDataChanged?: () => void;
}

const AvailabilityModal: React.FC<AvailabilityModalProps> = ({
  isOpen,
  onClose,
  user,
  userGroups,
  onDataChanged
}) => {
  // Use body scroll lock when modal is open
  useBodyScrollLock(isOpen);

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [type, setType] = useState('AVAILABLE'); // AVAILABLE, BUSY
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any[]>([]);

  // Carica le disponibilità dell'utente
  useEffect(() => {
    if (isOpen) {
      loadAvailability();
    }
  }, [isOpen, selectedGroup]);

  const loadAvailability = async () => {
    try {
      const params: any = {};
      if (selectedGroup) params.groupId = selectedGroup;
      
      const data = await availabilityApi.getAvailability(params);
      setAvailability(data);
    } catch (error) {
      console.error('Errore nel caricamento disponibilità:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !selectedDate) {
      alert('Seleziona un gruppo e una data');
      return;
    }

    setLoading(true);
    try {
      await availabilityApi.createAvailability({
        group_id: selectedGroup,
        date: selectedDate,
        type,
        notes: notes || undefined
      });

      await loadAvailability();
      
      // Ricarica i dati nel calendario
      if (onDataChanged) {
        onDataChanged();
      }
      
      // Reset form
      setSelectedDate('');
      setType('AVAILABLE');
      setNotes('');
      
      alert('Disponibilità aggiornata con successo!');
    } catch (error: any) {
      console.error('Errore nel salvataggio:', error);
      alert('Errore nel salvataggio: ' + (error.message || 'Errore sconosciuto'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (availabilityId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa disponibilità?')) return;

    try {
      await availabilityApi.deleteAvailability(availabilityId);
      await loadAvailability();
      
      // Ricarica i dati nel calendario
      if (onDataChanged) {
        onDataChanged();
      }
      
      alert('Disponibilità eliminata con successo!');
    } catch (error: any) {
      console.error('Errore nell\'eliminazione:', error);
      alert('Errore nell\'eliminazione: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              📅 Gestione Disponibilità
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Selezione Gruppo */}
          <div className="mb-6">
            <label htmlFor="group" className="block text-sm font-medium text-gray-700 mb-2">
              Seleziona Gruppo *
            </label>
            <select
              id="group"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tutti i tuoi gruppi</option>
              {userGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'})
                </option>
              ))}
            </select>
          </div>

          {/* Form per aggiungere disponibilità */}
          <div className="border-t pt-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Aggiungi Nuova Disponibilità
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    id="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Stato *
                  </label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="AVAILABLE">✅ Disponibile</option>
                    <option value="BUSY">❌ Impegnato</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Note (opzionali)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Es. Concerto in un'altra città, impegno familiare, ecc."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !selectedGroup}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Salvando...' : 'Aggiungi Disponibilità'}
              </button>
            </form>
          </div>

          {/* Lista disponibilità esistenti */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Le Tue Disponibilità
            </h3>
            {availability.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Nessuna disponibilità registrata{selectedGroup ? ' per questo gruppo' : ''}
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availability.map((avail: any) => (
                  <div
                    key={avail.id}
                    className={`p-3 rounded-md border ${
                      avail.type === 'AVAILABLE' 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            avail.type === 'AVAILABLE' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {avail.type === 'AVAILABLE' ? '✅ Disponibile' : '❌ Impegnato'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(avail.date).toLocaleDateString('it-IT')}
                          </span>
                        </div>
                        {avail.group && (
                          <div className="text-xs text-gray-500 mt-1">
                            📅 {avail.group.name}
                          </div>
                        )}
                        {avail.notes && (
                          <div className="text-sm text-gray-600 mt-1">
                            💬 {avail.notes}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete(avail.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityModal;