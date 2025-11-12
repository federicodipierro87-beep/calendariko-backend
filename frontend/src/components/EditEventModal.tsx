import React, { useState } from 'react';

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
    title: event.title,
    event_type: event.event_type || 'rehearsal',
    date: event.date ? event.date.split('T')[0] : '',
    start_time: event.start_time ? event.start_time.split('T')[1]?.substring(0, 5) || '' : '',
    end_time: event.end_time ? event.end_time.split('T')[1]?.substring(0, 5) || '' : '',
    venue_name: event.venue_name,
    venue_address: event.venue_address || '',
    venue_city: event.venue_city,
    group_id: event.group_id || '',
    fee: event.fee?.toString() || '',
    notes: event.notes || '',
    contact_responsible: event.contact_responsible || ''
  });

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
    
    // Costruisci l'oggetto con le modifiche
    const eventUpdates = {
      id: event.id,
      title: formData.title,
      event_type: formData.event_type,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      venue_name: formData.venue_name,
      venue_address: formData.venue_address,
      venue_city: formData.venue_city,
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Titolo e Tipo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Titolo Evento *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="event_type" className="block text-sm font-medium text-gray-700 mb-1">
                Tipo Evento
              </label>
              <select
                id="event_type"
                name="event_type"
                value={formData.event_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rehearsal">Opzionata</option>
                <option value="availability">Confermata</option>
              </select>
            </div>
          </div>

          {/* Data e Orari */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Data *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                Ora Inizio *
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                Ora Fine *
              </label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Locale */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="venue_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome Locale *
              </label>
              <input
                type="text"
                id="venue_name"
                name="venue_name"
                value={formData.venue_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="venue_address" className="block text-sm font-medium text-gray-700 mb-1">
                Indirizzo
              </label>
              <input
                type="text"
                id="venue_address"
                name="venue_address"
                value={formData.venue_address}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="venue_city" className="block text-sm font-medium text-gray-700 mb-1">
                Città *
              </label>
              <input
                type="text"
                id="venue_city"
                name="venue_city"
                value={formData.venue_city}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Gruppo e Fee */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="group_id" className="block text-sm font-medium text-gray-700 mb-1">
                Gruppo
              </label>
              <select
                id="group_id"
                name="group_id"
                value={formData.group_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleziona gruppo...</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fee" className="block text-sm font-medium text-gray-700 mb-1">
                Compenso (€)
              </label>
              <input
                type="number"
                id="fee"
                name="fee"
                value={formData.fee}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Contatto Responsabile */}
          <div>
            <label htmlFor="contact_responsible" className="block text-sm font-medium text-gray-700 mb-1">
              Contatto Responsabile
            </label>
            <input
              type="text"
              id="contact_responsible"
              name="contact_responsible"
              value={formData.contact_responsible}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              💾 Salva Modifiche
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventModal;