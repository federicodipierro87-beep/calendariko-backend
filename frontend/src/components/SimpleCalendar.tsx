import React, { useState } from 'react';

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'rehearsal' | 'availability' | 'availability-busy';
  fee?: number;
  contact_responsible?: string;
}

interface SimpleCalendarProps {
  events?: Event[];
  onDayClick?: (date: string) => void;
  userRole?: string;
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({ events = [], onDayClick, userRole }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const weekDays = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day &&
           today.getMonth() === month &&
           today.getFullYear() === year;
  };

  const hasEvent = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const filteredEvents = getFilteredEvents(dayStr);
    return filteredEvents.length > 0;
  };

  const getFilteredEvents = (dayStr: string) => {
    let dayEvents = events.filter(event => event.date === dayStr);
    
    // Se l'utente è admin, nascondi le indisponibilità sul calendario
    if (userRole === 'ADMIN') {
      dayEvents = dayEvents.filter(event => event.type !== 'availability-busy');
    }
    
    return dayEvents;
  };

  const getEventTypeColor = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = getFilteredEvents(dayStr);
    
    if (dayEvents.length === 0) return '';
    
    // Priorità: indisponibilità (rosso) > eventi (viola) > prove (blu) > disponibilità (verde)
    if (dayEvents.some(e => e.type === 'availability-busy')) return 'bg-red-100 border-red-300';
    if (dayEvents.some(e => e.type === 'availability')) return 'bg-green-100 border-green-300';
    if (dayEvents.some(e => e.type === 'rehearsal')) return 'bg-blue-100 border-blue-300';
    
    return '';
  };

  const getDayEvents = (day: number) => {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getFilteredEvents(dayStr);
  };

  const handleDayClick = (day: number) => {
    if (onDayClick) {
      const clickedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      onDayClick(clickedDate);
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Giorni vuoti prima del primo giorno del mese
    for (let i = 0; i < firstDayWeekday; i++) {
      days.push(
        <div key={`empty-${i}`} className="min-h-[2rem] md:min-h-[3rem]"></div>
      );
    }

    // Giorni del mese
    for (let day = 1; day <= daysInMonth; day++) {
      const todayClass = isToday(day) ? 'bg-blue-500 text-white font-bold' : '';
      const eventClass = hasEvent(day) ? getEventTypeColor(day) : '';
      const hoverClass = onDayClick ? 'hover:bg-blue-100 hover:border-blue-300' : 'hover:bg-gray-50';
      const dayEvents = getDayEvents(day);
      
      days.push(
        <div
          key={day}
          onClick={() => handleDayClick(day)}
          className={`min-h-[2rem] md:min-h-[3rem] border border-gray-200 cursor-pointer ${hoverClass} ${todayClass} ${eventClass} transition-colors p-1 flex flex-col`}
          title={onDayClick ? (
            userRole === 'ARTIST' 
              ? 'Clicca per gestire indisponibilità (se non ci sono eventi)' 
              : 'Clicca per visualizzare/creare eventi'
          ) : ''}
        >
          <div className="text-xs md:text-sm font-medium mb-1">{day}</div>
          <div className="flex-1 overflow-hidden">
            {dayEvents.slice(0, 2).map((event, index) => (
              <div
                key={event.id}
                className="text-xs mb-1 px-1 py-0.5 rounded"
                style={{
                  backgroundColor: event.type === 'availability-busy' ? '#fee2e2' :
                                   event.type === 'availability' ? '#dcfce7' :
                                   '#dbeafe',
                  color: event.type === 'availability-busy' ? '#991b1b' :
                         event.type === 'availability' ? '#166534' :
                         '#1e40af'
                }}
              >
                {event.type === 'availability-busy' ? 'Indisponibile' : event.title}
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 font-medium">
                +{dayEvents.length - 2} altri
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* Header del calendario */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            →
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Oggi
        </button>
      </div>

      {/* Giorni della settimana */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-gray-500">
            {day}
          </div>
        ))}
      </div>

      {/* Griglia del calendario */}
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>

      {/* Legenda */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
          <span>Eventi</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Prove</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span>Disponibilità</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
          <span>Indisponibilità</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span>Oggi</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleCalendar;