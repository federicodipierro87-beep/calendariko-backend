import React, { useState } from 'react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'event' | 'availability' | 'rehearsal' | 'availability-busy';
  venue?: string;
  notes?: string;
  group_id?: string;
  fee?: number;
  group?: {
    id: string;
    name: string;
    type: string;
  };
  user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  availability_id?: string;
}

interface Group {
  id: string;
  name: string;
  type: 'BAND' | 'DJ' | 'SOLO';
  description?: string;
  genre?: string;
}

interface DayEventsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  events: Event[];
  groups: Group[];
  user: any;
  userGroups: any[];
  users?: any[]; // Lista di tutti gli utenti per admin
  onCreateEvent: (event: Omit<Event, 'id'>) => void;
  onDeleteEvent: (eventId: string) => void;
  onCreateAvailability?: (availability: any) => void;
}

const DayEventsModal: React.FC<DayEventsModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
  groups,
  user,
  userGroups,
  users = [],
  onCreateEvent,
  onDeleteEvent,
  onCreateAvailability
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCreatingAvailability, setIsCreatingAvailability] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
    endTime: '',
    type: 'event' as const,
    venue: '',
    notes: '',
    group_id: '',
    fee: ''
  });
  const [newAvailability, setNewAvailability] = useState({
    group_id: '',
    user_id: '',
    notes: ''
  });

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEvent.title && newEvent.time && newEvent.endTime && newEvent.group_id) {
      onCreateEvent({
        ...newEvent,
        date: selectedDate
      });
      setNewEvent({
        title: '',
        time: '',
        endTime: '',
        type: 'event',
        venue: '',
        notes: '',
        group_id: '',
        fee: ''
      });
      setIsCreating(false);
    }
  };

  const handleCreateAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (newAvailability.group_id && onCreateAvailability) {
      const availabilityData: any = {
        group_id: newAvailability.group_id,
        date: selectedDate,
        type: 'BUSY',
        notes: newAvailability.notes || undefined
      };

      // Solo per artisti aggiungiamo user_id, per admin l'indisponibilità è per tutto il gruppo
      if (user?.role === 'ARTIST') {
        availabilityData.user_id = user.id;
      }

      onCreateAvailability(availabilityData);
      setNewAvailability({
        group_id: '',
        user_id: '',
        notes: ''
      });
      setIsCreatingAvailability(false);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'event': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'rehearsal': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'availability': return 'bg-green-100 text-green-700 border-green-200';
      case 'availability-busy': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'event': return 'Evento';
      case 'rehearsal': return 'Prova';
      case 'availability': return 'Disponibilità';
      case 'availability-busy': return 'Indisponibilità';
      default: return type;
    }
  };

  // Controlla se ci sono eventi reali (non indisponibilità) nella giornata
  const hasRealEvents = () => {
    return events.some(event => 
      event.type === 'event' || event.type === 'rehearsal'
    );
  };

  // Controlla se l'utente ha già un'indisponibilità per questo giorno
  const hasUserUnavailability = () => {
    return events.some(event => 
      event.type === 'availability-busy' && 
      event.user?.id === user?.id
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              📅 {formatDate(selectedDate)}
            </h2>
            {user?.role === 'ARTIST' && (
              <p className="text-sm text-gray-600 mt-1">
                Gestisci eventi e aggiungi indisponibilità per questo giorno
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Eventi esistenti */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Eventi del giorno</h3>
          {events.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-2">
                Nessun evento programmato per questo giorno
              </p>
              {user?.role === 'ARTIST' && userGroups && userGroups.length > 0 && (
                <p className="text-sm text-green-600">
                  ✅ Puoi aggiungere una indisponibilità per questo giorno
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className={`border rounded-lg p-4 ${getEventTypeColor(event.type)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{event.title}</h4>
                        <span className="px-2 py-1 rounded text-xs bg-white bg-opacity-50">
                          {getEventTypeLabel(event.type)}
                        </span>
                      </div>
                      <p className="text-sm opacity-80">⏰ {event.time}</p>
                      {event.venue && (
                        <p className="text-sm opacity-80">📍 {event.venue}</p>
                      )}
                      {event.fee && user?.role === 'ADMIN' && (
                        <p className="text-sm opacity-80">💰 Cachet: €{event.fee}</p>
                      )}
                      {event.group && (
                        <p className="text-sm opacity-80">👥 {event.group.name}</p>
                      )}
                      {event.user && event.type === 'availability-busy' && (
                        <p className="text-sm opacity-80">👤 {event.user.first_name} {event.user.last_name}</p>
                      )}
                      {event.notes && (
                        <p className="text-sm opacity-80 mt-1">📝 {event.notes}</p>
                      )}
                    </div>
                    {/* Pulsante elimina per eventi (solo admin) */}
                    {event.type !== 'availability-busy' && user?.role === 'ADMIN' && (
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Elimina evento"
                      >
                        🗑️
                      </button>
                    )}
                    
                    {/* Pulsante elimina per indisponibilità proprie */}
                    {event.type === 'availability-busy' && event.user?.id === user?.id && (
                      <button
                        onClick={() => {
                          if (confirm('Sei sicuro di voler rimuovere questa indisponibilità?')) {
                            // Qui dovresti chiamare l'API per eliminare l'availability
                            // Per ora uso onDeleteEvent che funziona per gli eventi normali
                            onDeleteEvent(event.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 ml-2"
                        title="Rimuovi indisponibilità"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pulsanti di azione */}
        <div className="space-y-3">
          {/* Pulsante per creare nuovo evento - solo per admin */}
          {user?.role === 'ADMIN' && !isCreating && !isCreatingAvailability && (
            <button
              onClick={() => setIsCreating(true)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              ➕ Crea Nuovo Evento
            </button>
          )}

          {/* Pulsante per aggiungere indisponibilità - per artisti */}
          {user?.role === 'ARTIST' && !isCreating && !isCreatingAvailability && userGroups && userGroups.length > 0 && (
            <>
              {hasRealEvents() ? (
                <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-3 px-4 rounded-md text-center">
                  <p className="font-medium">⚠️ Non puoi aggiungere indisponibilità</p>
                  <p className="text-sm">Ci sono già eventi programmati per questo giorno</p>
                </div>
              ) : hasUserUnavailability() ? (
                <div className="w-full bg-blue-50 border border-blue-200 text-blue-800 py-3 px-4 rounded-md text-center">
                  <p className="font-medium">📅 Hai già segnato questo giorno come impegnato</p>
                  <p className="text-sm">Puoi modificare o eliminare l'indisponibilità dalla sezione Disponibilità</p>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingAvailability(true)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-md transition-colors font-medium shadow-lg"
                >
                  ❌ Aggiungi Indisponibilità
                  <span className="block text-sm opacity-90 mt-1">
                    Segna questo giorno come impegnato
                  </span>
                </button>
              )}
            </>
          )}

          {/* Messaggio se artista non ha gruppi */}
          {user?.role === 'ARTIST' && !isCreating && !isCreatingAvailability && (!userGroups || userGroups.length === 0) && (
            <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 py-3 px-4 rounded-md text-center">
              <p className="font-medium">Non sei ancora membro di nessun gruppo</p>
              <p className="text-sm">Contatta l'amministratore per essere aggiunto a un gruppo e poter gestire le tue disponibilità</p>
            </div>
          )}

          {/* Pulsante per aggiungere indisponibilità anche agli admin */}
          {user?.role === 'ADMIN' && !isCreating && !isCreatingAvailability && (
            <>
              {groups?.filter(group => group.type === 'BAND' || group.type === 'DJ').length > 0 ? (
                <button
                  onClick={() => setIsCreatingAvailability(true)}
                  className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  ❌ Aggiungi Indisponibilità Gruppo
                </button>
              ) : (
                <div className="w-full bg-gray-50 border border-gray-200 text-gray-600 py-3 px-4 rounded-md text-center">
                  <p className="font-medium">Nessuna Band o DJ disponibile</p>
                  <p className="text-sm">Non puoi aggiungere indisponibilità per artisti solisti</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Form per creare nuovo evento - solo admin */}
        {user?.role === 'ADMIN' && isCreating ? (
          /* Form per creare nuovo evento */
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Crea Nuovo Evento</h3>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titolo Evento *
                </label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Es: Concerto Jazz Club"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orario Inizio *
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Orario Fine *
                  </label>
                  <input
                    type="time"
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="event">Evento</option>
                    <option value="rehearsal">Prova</option>
                    <option value="availability">Disponibilità</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gruppo/Artista *
                </label>
                <select
                  value={newEvent.group_id}
                  onChange={(e) => setNewEvent({ ...newEvent, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleziona gruppo/artista</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue/Luogo
                </label>
                <input
                  type="text"
                  value={newEvent.venue}
                  onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Es: Jazz Club Milano"
                />
              </div>

              {/* Campo Cachet - solo per Admin */}
              {user?.role === 'ADMIN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    💰 Cachet (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newEvent.fee}
                    onChange={(e) => setNewEvent({ ...newEvent, fee: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Es: 500.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  ✅ Crea Evento
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  ❌ Annulla
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* Form per aggiungere indisponibilità */}
        {isCreatingAvailability && (
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              {user?.role === 'ADMIN' ? 'Aggiungi Indisponibilità Gruppo' : 'Aggiungi Indisponibilità'}
            </h3>
            <form onSubmit={handleCreateAvailability} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gruppo *
                </label>
                <select
                  value={newAvailability.group_id}
                  onChange={(e) => setNewAvailability({ ...newAvailability, group_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Seleziona gruppo</option>
                  {(user?.role === 'ARTIST' 
                    ? userGroups 
                    : groups?.filter(group => group.type === 'BAND' || group.type === 'DJ')
                  )?.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'})
                    </option>
                  ))}
                </select>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo (opzionale)
                </label>
                <textarea
                  value={newAvailability.notes}
                  onChange={(e) => setNewAvailability({ ...newAvailability, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={2}
                  placeholder="Es. Concerto con altra band, impegno familiare, ecc."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
                >
                  ❌ Aggiungi Indisponibilità
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingAvailability(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  ↩️ Annulla
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default DayEventsModal;