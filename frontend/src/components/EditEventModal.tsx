import React, { useState, useEffect } from 'react';

interface Event {
  id: string;
  title: string;
  event_type?: string;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  venue_address?: string;
  venue_city: string;
  group_id?: string;
  fee?: number;
  status?: string;
  notes?: string;
  contact_responsible?: string;
}

interface Group {
  id: string;
  name: string;
  type: 'BAND' | 'DJ' | 'SOLO';
}

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<Event>) => void;
  event: Event;
  groups: Group[];
}

const EditEventModal: React.FC<EditEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  event,
  groups
}) => {
  const [formData, setFormData] = useState({
    title: '',
    type: 'rehearsal',
    time: '',
    endTime: '',
    venue: '',
    group_id: '',
    fee: '',
    notes: '',
    contact_responsible: ''
  });

  // Aggiorna il form quando cambia l'evento
  useEffect(() => {
    if (event && isOpen) {
      console.log('EditEventModal - Event data received:', event);
      console.log('EditEventModal - Available fields:', Object.keys(event));
      
      // Funzione helper per estrarre data
      const getDatePart = (dateStr: string | Date) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      };
      
      // Funzione helper per estrarre tempo
      const getTimePart = (dateStr: string | Date) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toTimeString().substring(0, 5);
      };
      
      // Cast per bypassare TypeScript e accedere ai campi dinamicamente
      const eventData = event as any;
      
      const newFormData = {
        title: eventData.title || '',
        type: eventData.type || eventData.event_type || 'rehearsal',
        time: getTimePart(eventData.time || eventData.start_time),
        endTime: getTimePart(eventData.endTime || eventData.end_time),
        venue: eventData.venue || eventData.venue_name || '',
        group_id: eventData.group_id || '',
        fee: eventData.fee?.toString() || '',
        notes: eventData.notes || '',
        contact_responsible: eventData.contact_responsible || ''
      };
      
      console.log('EditEventModal - Form data set to:', newFormData);
      setFormData(newFormData);
    }
  }, [event, isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Costruisci l'oggetto con le modifiche mappando ai nomi API corretti
    const eventUpdates = {
      id: event.id,
      title: formData.title,
      event_type: formData.type,           // Mappa 'type' a 'event_type'
      date: event.date,                    // Usa la data originale dell'evento (non modificabile nel modal di modifica)
      start_time: formData.time,           // Mappa 'time' a 'start_time' 
      end_time: formData.endTime,          // Mappa 'endTime' a 'end_time'
      venue_name: formData.venue,          // Mappa 'venue' a 'venue_name'
      venue_address: '',                   // Campi non presenti nel modal semplificato
      venue_city: 'Milano',                // Default
      group_id: formData.group_id,
      fee: formData.fee ? parseFloat(formData.fee) : undefined,
      notes: formData.notes,
      contact_responsible: formData.contact_responsible
    };

    onSave(eventUpdates);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            ✏️ Modifica Evento
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IDENTICO AL MODAL DI CREAZIONE */}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titolo Evento *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
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
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="availability">Confermata</option>
                <option value="rehearsal">Opzionata</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gruppo/Artista *
            </label>
            <select
              value={formData.group_id}
              onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
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
              Locale
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es: Jazz Club Milano"
            />
          </div>

          {/* Campo Cachet - solo per Admin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💰 Cachet (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.fee}
              onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es: 500.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              👤 Contatto responsabile
            </label>
            <input
              type="text"
              value={formData.contact_responsible}
              onChange={(e) => setFormData({ ...formData, contact_responsible: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Es: Mario Rossi, 329-1234567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              ✅ Salva Modifiche
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
            >
              ❌ Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventModal;