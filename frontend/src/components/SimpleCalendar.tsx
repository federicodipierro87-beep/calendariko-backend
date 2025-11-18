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

type CalendarView = 'month' | 'week' | 'day';

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({ events = [], onDayClick, userRole }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState<CalendarView>('month');

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

  // Helper functions for different views
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getWeekDays = () => {
    const weekStart = getWeekStart(currentDate);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return getFilteredEvents(dateStr);
  };

  const previousPeriod = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (currentView === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    } else if (currentView === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 1);
      setCurrentDate(newDate);
    }
  };

  const nextPeriod = () => {
    if (currentView === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (currentView === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    } else if (currentView === 'day') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 1);
      setCurrentDate(newDate);
    }
  };

  const getViewTitle = () => {
    if (currentView === 'month') {
      return `${monthNames[month]} ${year}`;
    } else if (currentView === 'week') {
      const weekDates = getWeekDays();
      const start = weekDates[0];
      const end = weekDates[6];
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();
      
      if (startMonth === endMonth) {
        return `${start.getDate()} - ${end.getDate()} ${monthNames[startMonth]} ${start.getFullYear()}`;
      } else {
        return `${start.getDate()} ${monthNames[startMonth]} - ${end.getDate()} ${monthNames[endMonth]} ${start.getFullYear()}`;
      }
    } else {
      return `${currentDate.getDate()} ${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  };

  const renderWeekView = () => {
    const weekDates = getWeekDays();
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-[600px] overflow-hidden">
        {/* Header giorni della settimana */}
        <div className="flex border-b bg-gray-50">
          <div className="w-16 flex-shrink-0 border-r"></div>
          {weekDates.map((date, index) => (
            <div key={index} className="flex-1 p-2 border-r text-center">
              <div className="text-xs text-gray-500 uppercase">
                {weekDays[date.getDay()]}
              </div>
              <div className={`text-lg font-medium ${
                date.toDateString() === new Date().toDateString() 
                  ? 'bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                  : 'text-gray-900'
              }`}>
                {date.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Grid ore e eventi */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Colonna ore */}
            <div className="w-16 flex-shrink-0 border-r bg-gray-50">
              {hours.map(hour => (
                <div key={hour} className="h-12 border-b flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-500">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colonne giorni */}
            {weekDates.map((date, dayIndex) => {
              const dayEvents = getEventsForDate(date);
              return (
                <div key={dayIndex} className="flex-1 border-r relative">
                  {hours.map(hour => (
                    <div 
                      key={hour} 
                      className="h-12 border-b hover:bg-blue-25 cursor-pointer"
                      onClick={() => onDayClick && onDayClick(date.toISOString().split('T')[0])}
                    ></div>
                  ))}

                  {/* Eventi */}
                  {dayEvents.map((event, eventIndex) => {
                    const startHour = event.time ? parseInt(event.time.split(':')[0]) : 0;
                    const startMinute = event.time ? parseInt(event.time.split(':')[1]) : 0;
                    const topPosition = (startHour * 48) + (startMinute * 0.8);

                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 bg-blue-500 text-white text-xs p-1 rounded shadow z-10"
                        style={{ 
                          top: `${topPosition}px`,
                          height: '40px'
                        }}
                      >
                        <div className="font-medium truncate">{event.title}</div>
                        <div className="truncate">{formatTime(event.time)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const dayEvents = getEventsForDate(currentDate);

    return (
      <div className="flex flex-col h-[600px] overflow-hidden">
        {/* Header giorno */}
        <div className="flex border-b bg-gray-50 p-4">
          <div className="text-center">
            <div className="text-sm text-gray-500 uppercase">
              {weekDays[currentDate.getDay()]}
            </div>
            <div className={`text-2xl font-medium ${
              currentDate.toDateString() === new Date().toDateString()
                ? 'bg-blue-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto'
                : 'text-gray-900'
            }`}>
              {currentDate.getDate()}
            </div>
          </div>
        </div>

        {/* Grid ore e eventi */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Colonna ore */}
            <div className="w-20 flex-shrink-0 border-r bg-gray-50">
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b flex items-start justify-end pr-2 pt-1">
                  <span className="text-sm text-gray-500">
                    {hour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Colonna giorno */}
            <div className="flex-1 relative">
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="h-16 border-b hover:bg-blue-25 cursor-pointer"
                  onClick={() => onDayClick && onDayClick(currentDate.toISOString().split('T')[0])}
                ></div>
              ))}

              {/* Eventi */}
              {dayEvents.map((event, eventIndex) => {
                const startHour = event.time ? parseInt(event.time.split(':')[0]) : 0;
                const startMinute = event.time ? parseInt(event.time.split(':')[1]) : 0;
                const topPosition = (startHour * 64) + (startMinute * 1.07);

                return (
                  <div
                    key={event.id}
                    className="absolute left-2 right-2 bg-blue-500 text-white p-2 rounded shadow z-10"
                    style={{ 
                      top: `${topPosition}px`,
                      height: '50px'
                    }}
                  >
                    <div className="font-medium truncate">{event.title}</div>
                    <div className="text-sm truncate">{formatTime(event.time)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
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
            onClick={previousPeriod}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            ←
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            {getViewTitle()}
          </h2>
          <button
            onClick={nextPeriod}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            →
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {/* View selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCurrentView('month')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentView === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mese
            </button>
            <button
              onClick={() => setCurrentView('week')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentView === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Settimana
            </button>
            <button
              onClick={() => setCurrentView('day')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                currentView === 'day'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Giorno
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Oggi
          </button>
        </div>
      </div>

      {/* Contenuto del calendario basato sulla vista */}
      {currentView === 'month' ? (
        <>
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
        </>
      ) : currentView === 'week' ? (
        renderWeekView()
      ) : (
        renderDayView()
      )}

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