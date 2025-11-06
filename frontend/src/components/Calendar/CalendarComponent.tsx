import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Event, Availability, Group } from '../../types';
import { eventApi, availabilityApi, groupApi } from '../../services/api';

interface CalendarProps {
  userRole: 'ADMIN' | 'ARTIST';
  userId: string;
  onEventClick?: (event: Event) => void;
  onDateClick?: (date: string) => void;
}

const CalendarComponent: React.FC<CalendarProps> = ({
  userRole,
  userId,
  onEventClick,
  onDateClick,
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserGroups();
  }, []);

  useEffect(() => {
    if (userGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(userGroups[0].id);
    }
  }, [userGroups]);

  useEffect(() => {
    if (selectedGroupId) {
      loadData();
    }
  }, [selectedGroupId]);

  const loadUserGroups = async () => {
    try {
      const response = await groupApi.getUserGroups();
      setUserGroups(response.map(ug => ug.group));
    } catch (error) {
      console.error('Error loading user groups:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, availabilityData] = await Promise.all([
        eventApi.getAll({ groupId: selectedGroupId }),
        availabilityApi.get({ userId, groupId: selectedGroupId }),
      ]);

      setEvents(eventsData);
      setAvailability(availabilityData);
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCalendarEvents = () => {
    const calendarEvents = [];

    events.forEach((event) => {
      const startDateTime = new Date(`${event.date}T${event.start_time}`);
      const endDateTime = new Date(`${event.date}T${event.end_time}`);

      calendarEvents.push({
        id: event.id,
        title: event.title,
        start: startDateTime,
        end: endDateTime,
        backgroundColor: getEventColor(event.status),
        borderColor: getEventColor(event.status),
        extendedProps: {
          type: 'event',
          data: event,
        },
      });
    });

    availability.forEach((avail) => {
      calendarEvents.push({
        id: `avail-${avail.id}`,
        title: avail.type === 'AVAILABLE' ? 'Available' : 'Unavailable',
        start: avail.date,
        allDay: true,
        backgroundColor: avail.type === 'AVAILABLE' ? '#10b981' : '#ef4444',
        borderColor: avail.type === 'AVAILABLE' ? '#10b981' : '#ef4444',
        extendedProps: {
          type: 'availability',
          data: avail,
        },
      });
    });

    return calendarEvents;
  };

  const getEventColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#3b82f6';
      case 'PROPOSED':
        return '#f59e0b';
      case 'CANCELLED':
        return '#6b7280';
      default:
        return '#3b82f6';
    }
  };

  const handleEventClick = (clickInfo: any) => {
    const { type, data } = clickInfo.event.extendedProps;
    
    if (type === 'event' && onEventClick) {
      onEventClick(data);
    }
  };

  const handleDateClick = (dateClickInfo: any) => {
    if (onDateClick) {
      onDateClick(dateClickInfo.dateStr);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Calendar</h2>
        
        {userGroups.length > 1 && (
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {userGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-4 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded"></div>
          <span>Confirmed Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>Proposed Events</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>Unavailable</span>
        </div>
      </div>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={getCalendarEvents()}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        height="auto"
        editable={false}
        selectable={userRole === 'ARTIST'}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
      />
    </div>
  );
};

export default CalendarComponent;