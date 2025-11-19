import React from 'react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'availability' | 'availability-busy';
  fee?: number;
  contact_responsible?: string;
}

interface EventDetailsModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, isOpen, onClose }) => {
  if (!isOpen || !event) return null;

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    
    // Se è un timestamp ISO, estrai solo l'orario
    if (timeString.includes('T')) {
      try {
        const date = new Date(timeString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      } catch (e) {
        return timeString;
      }
    }
    
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('it-IT', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'availability-busy':
        return 'Indisponibilità';
      case 'availability':
        return 'Disponibilità';
      case 'rehearsal':
        return 'Prova';
      default:
        return 'Evento';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'availability-busy':
        return 'bg-red-500';
      case 'availability':
        return 'bg-green-500';
      case 'rehearsal':
        return 'bg-blue-500';
      default:
        return 'bg-purple-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Dettagli Evento</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Event Type Badge */}
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${getEventTypeColor(event.type)}`}>
              {getEventTypeLabel(event.type)}
            </span>
          </div>

          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {event.type === 'availability-busy' ? 'Indisponibile' : event.title}
            </h3>
          </div>

          {/* Date and Time */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Data</p>
                <p className="text-sm text-gray-600">{formatDate(event.date)}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Orario</p>
                <p className="text-sm text-gray-600">{formatTime(event.time)}</p>
              </div>
            </div>
          </div>

          {/* Fee (if present) */}
          {event.fee && event.fee > 0 && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Compenso</p>
                <p className="text-sm text-gray-600">€ {event.fee}</p>
              </div>
            </div>
          )}

          {/* Contact Responsible (if present) */}
          {event.contact_responsible && (
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Responsabile</p>
                <p className="text-sm text-gray-600">{event.contact_responsible}</p>
              </div>
            </div>
          )}

          {/* Event ID */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">ID: {event.id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetailsModal;