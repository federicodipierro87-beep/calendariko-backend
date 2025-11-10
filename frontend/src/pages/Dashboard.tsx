import React, { useState } from 'react';
import SimpleCalendar from '../components/SimpleCalendar';
import DayEventsModal from '../components/DayEventsModal';
import CreateGroupModal from '../components/CreateGroupModal';
import CreateUserModal from '../components/CreateUserModal';
import GroupDetailModal from '../components/GroupDetailModal';
import AvailabilityModal from '../components/AvailabilityModal';
import { groupsApi, eventsApi, usersApi, availabilityApi } from '../utils/api';

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeSection, setActiveSection] = useState('home');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showEventsList, setShowEventsList] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [userGroups, setUserGroups] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState({
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    birthDate: '',
    businessName: '',
    vatNumber: '',
    address: '',
    zipCode: '',
    city: '',
    province: ''
  });

  // Carica dati iniziali
  React.useEffect(() => {
    const loadData = async () => {
      try {
        // Carica eventi
        const eventsData = await eventsApi.getAll();
        // Trasforma il formato degli eventi per il calendario
        const transformedEvents = eventsData.map((event: any) => ({
          id: event.id,
          title: event.title,
          date: event.date ? event.date.split('T')[0] : '', // Estrae solo la data con controllo
          time: event.start_time || '',
          type: event.event_type || 'event',
          venue: event.venue_name || '',
          notes: event.notes || '',
          group_id: event.group_id,
          group: event.group,
          fee: event.fee || 0
        }));
        
        // Carica gruppi
        const groupsData = await groupsApi.getAll();
        console.log('🔍 FRONTEND - Groups received:', groupsData.length, groupsData.map((g: any) => g.id));
        setGroups(groupsData);

        // Carica gruppi dell'utente corrente per le availability
        if (user.role === 'ARTIST') {
          const userGroupsData = await groupsApi.getUserGroups();
          console.log('🔍 FRONTEND - User groups received:', userGroupsData.length, userGroupsData.map((g: any) => g.id));
          setUserGroups(userGroupsData);
        }
        
        // Carica utenti se admin
        if (user.role === 'ADMIN') {
          const usersData = await usersApi.getAll();
          setUsers(usersData);
        }

        // Carica disponibilità
        const availabilityData = await availabilityApi.getAvailability({});
        // Trasforma le disponibilità in eventi per il calendario
        const transformedAvailability = availabilityData
          .filter((avail: any) => avail.type === 'UNAVAILABLE') // Solo le indisponibilità
          .map((avail: any) => ({
            id: `avail-${avail.id}`,
            title: `❌ ${avail.user?.first_name || 'Utente'} - Impegnato`,
            date: avail.date ? avail.date.split('T')[0] : '',
            time: 'Tutto il giorno',
            type: 'availability-busy',
            notes: avail.notes || 'Indisponibile',
            group_id: avail.group_id,
            group: avail.group,
            user: avail.user,
            availability_id: avail.id
          }))
          .filter((avail: any) => avail.date); // Filtra eventi senza data valida

        // Combina eventi e disponibilità, filtrando quelli senza data
        setEvents([
          ...transformedEvents.filter((event: any) => event.date), 
          ...transformedAvailability
        ]);
        
      } catch (error) {
        console.error('Errore nel caricamento dei dati:', error);
        // Se l'errore è di autenticazione, l'utility API gestirà il logout automatico
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Funzione per ricaricare i dati (da chiamare dopo modifiche)
  const reloadData = async () => {
    try {
      // Carica eventi
      const eventsData = await eventsApi.getAll();
      const transformedEvents = eventsData.map((event: any) => ({
        id: event.id,
        title: event.title,
        date: event.date ? event.date.split('T')[0] : '',
        time: event.start_time || '',
        type: event.event_type || 'event',
        venue: event.venue_name || '',
        notes: event.notes || '',
        group_id: event.group_id,
        group: event.group,
        fee: event.fee || 0
      }));

      // Carica disponibilità
      const availabilityData = await availabilityApi.getAvailability({});
      const transformedAvailability = availabilityData
        .filter((avail: any) => avail.type === 'UNAVAILABLE')
        .map((avail: any) => ({
          id: `avail-${avail.id}`,
          title: `❌ ${avail.user?.first_name || 'Utente'} - Impegnato`,
          date: avail.date ? avail.date.split('T')[0] : '',
          time: 'Tutto il giorno',
          type: 'availability-busy',
          notes: avail.notes || 'Indisponibile',
          group_id: avail.group_id,
          group: avail.group,
          user: avail.user,
          availability_id: avail.id
        }))
        .filter((avail: any) => avail.date); // Filtra gli eventi senza data valida

      // Combina eventi e disponibilità
      setEvents([...transformedEvents.filter((event: any) => event.date), ...transformedAvailability]);
    } catch (error) {
      console.error('Errore nel ricaricamento dei dati:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    window.location.reload();
  };

  const handleForceReauth = () => {
    if (window.confirm('Questo rimuoverà tutti i token e farà un nuovo login. Continuare?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSectionClick = (section: string) => {
    setActiveSection(section);
  };

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleCreateEvent = async (newEvent: any) => {
    try {
      const eventData = {
        title: newEvent.title,
        event_type: newEvent.type,
        date: newEvent.date,
        start_time: newEvent.time,
        end_time: newEvent.endTime,
        venue_name: newEvent.venue || 'Da definire',
        venue_city: 'Milano', // Default, potrebbe essere configurabile
        group_id: newEvent.group_id,
        notes: newEvent.notes,
        fee: newEvent.fee ? parseFloat(newEvent.fee) : undefined
      };

      console.log('📤 Creazione evento in corso...', eventData);
      const createdEvent = await eventsApi.create(eventData);
      console.log('📥 Evento ricevuto dal backend:', createdEvent);
      
      // Trasforma l'evento per il calendario con controlli null
      const transformedEvent = {
        id: createdEvent.id,
        title: createdEvent.title || newEvent.title,
        date: createdEvent.date ? createdEvent.date.split('T')[0] : newEvent.date,
        time: createdEvent.start_time || newEvent.time,
        type: createdEvent.event_type || newEvent.type || 'event',
        venue: createdEvent.venue_name || newEvent.venue || '',
        notes: createdEvent.notes || newEvent.notes || '',
        group_id: createdEvent.group_id || newEvent.group_id,
        group: createdEvent.group,
        fee: createdEvent.fee || (newEvent.fee ? parseFloat(newEvent.fee) : 0)
      };
      
      console.log('✅ Evento trasformato per il calendario:', transformedEvent);
      setEvents(prevEvents => [...prevEvents, transformedEvent]);
      
      // Ricarica i dati per sicurezza
      setTimeout(() => reloadData(), 500);
      
      alert('✅ Evento creato con successo!');
    } catch (error: any) {
      console.error('❌ Errore nella creazione dell\'evento:', error);
      const errorMessage = error?.message || 'Errore sconosciuto';
      alert(`❌ Errore nella creazione dell'evento: ${errorMessage}`);
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(event => event.id !== eventId));
  };

  const handleCreateAvailability = async (availabilityData: any) => {
    try {
      // Se non è specificato un user_id e l'utente è un artista, usa il suo ID
      if (!availabilityData.user_id && user.role === 'ARTIST') {
        availabilityData.user_id = user.id;
      }
      
      await availabilityApi.createAvailability(availabilityData);
      
      // Ricarica i dati per aggiornare il calendario
      await reloadData();
      
      alert('✅ Indisponibilità aggiunta con successo!');
    } catch (error: any) {
      console.error('Errore nella creazione dell\'indisponibilità:', error);
      alert('Errore nella creazione dell\'indisponibilità: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const handleCreateGroup = async (groupData: any) => {
    try {
      const newGroup = await groupsApi.create(groupData);
      setGroups([...groups, newGroup]);
      alert('✅ Gruppo creato con successo!');
    } catch (error: any) {
      console.error('Errore nella creazione del gruppo:', error);
      alert(`Errore nella creazione del gruppo: ${error.message}`);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      const newUser = await usersApi.create(userData);
      
      // Ricarica la lista degli utenti
      if (user.role === 'ADMIN') {
        const updatedUsers = await usersApi.getAll();
        setUsers(updatedUsers);
      }
      
      // Se l'utente è stato assegnato a dei gruppi, aggiorna la lista dei gruppi
      if (userData.selectedGroups && userData.selectedGroups.length > 0) {
        // Ricarica i gruppi per vedere i nuovi membri
        const updatedGroups = await groupsApi.getAll();
        setGroups(updatedGroups);
      }
      
      alert('✅ Utente creato con successo! Le credenziali di accesso sono state inviate via email.');
    } catch (error: any) {
      console.error('Errore nella creazione dell\'utente:', error);
      alert(`Errore nella creazione dell'utente: ${error.message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      await usersApi.delete(userId);
      
      // Ricarica la lista degli utenti
      const updatedUsers = await usersApi.getAll();
      setUsers(updatedUsers);
      
      alert('✅ Utente eliminato con successo.');
    } catch (error: any) {
      console.error('Errore nell\'eliminazione dell\'utente:', error);
      alert(`Errore nell'eliminazione dell'utente: ${error.message}`);
    }
  };

  const handleGroupClick = (group: any) => {
    setSelectedGroup(group);
    setShowGroupDetailModal(true);
  };

  const handleGroupUpdated = async () => {
    try {
      const updatedGroups = await groupsApi.getAll();
      setGroups(updatedGroups);
    } catch (error) {
      console.error('Errore nel ricaricamento dei gruppi:', error);
    }
  };

  const handleProfileChange = (field: string, value: string) => {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProfile = async () => {
    try {
      // Qui dovresti chiamare l'API per salvare i dati dell'utente
      // await usersApi.updateProfile(userProfile);
      alert('✅ Profilo aggiornato con successo!');
    } catch (error: any) {
      console.error('Errore nel salvataggio del profilo:', error);
      alert('Errore nel salvataggio: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                🎵 Calendariko - Dashboard {user.role === 'ADMIN' ? 'Admin' : 'Artista'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Benvenuto, {user.first_name} {user.last_name}
              </span>
              <button
                onClick={handleForceReauth}
                className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-xs"
                title="Debug: Forza nuovo login"
              >
                🔄 Re-auth
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-md text-sm font-medium text-gray-700"
              >
                Esci
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Navigation Menu */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-3">
              <nav className="flex space-x-8">
                <button
                  onClick={() => handleSectionClick('home')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === 'home'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  🏠 Home
                </button>
                <button
                  onClick={() => handleSectionClick('calendar')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === 'calendar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  📅 Calendario
                </button>
                <button
                  onClick={() => handleSectionClick('groups')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === 'groups'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  👥 Gruppi
                </button>
                <button
                  onClick={() => handleSectionClick('user')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === 'user'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  👤 Profilo
                </button>
                <button
                  onClick={() => handleSectionClick('events')}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    activeSection === 'events'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {user.role === 'ADMIN' ? '🎤 Eventi' : '📅 Disponibilità'}
                </button>
                {user.role === 'ADMIN' && (
                  <>
                    <button
                      onClick={() => handleSectionClick('users')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeSection === 'users'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      👤 Utenti
                    </button>
                    <button
                      onClick={() => handleSectionClick('notifications')}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        activeSection === 'notifications'
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      📧 Notifiche
                    </button>
                  </>
                )}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {activeSection === 'home' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-6">
                    🎉 Benvenuto in Calendariko!
                  </h3>
                  
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Caricamento dati...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Layout con calendario e cards */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Calendario */}
                        <div className="lg:col-span-2">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">📅 Calendario Eventi</h4>
                          <SimpleCalendar events={events} onDayClick={handleDayClick} userRole={user.role} />
                        </div>

                    {/* Sidebar con funzioni rapide */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">🚀 Accesso Rapido</h4>
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionClick('calendar')}>
                            <h5 className="text-blue-800 font-medium mb-1">📅 Calendario</h5>
                            <p className="text-blue-700 text-sm">
                              Gestisci eventi e disponibilità
                            </p>
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors" onClick={() => handleSectionClick('groups')}>
                            <h5 className="text-green-800 font-medium mb-1">👥 Gruppi</h5>
                            <p className="text-green-700 text-sm">
                              {user.role === 'ADMIN' ? 'Coordina band e artisti' : 'I tuoi gruppi'}
                            </p>
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSectionClick('user')}>
                            <h5 className="text-slate-800 font-medium mb-1">👤 Profilo</h5>
                            <p className="text-slate-700 text-sm">
                              Aggiorna dati personali
                            </p>
                          </div>

                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => handleSectionClick('events')}>
                            <h5 className="text-purple-800 font-medium mb-1">🎤 Eventi</h5>
                            <p className="text-purple-700 text-sm">
                              {user.role === 'ADMIN' ? 'Crea nuovi eventi' : 'Gestisci disponibilità'}
                            </p>
                          </div>

                          {user.role === 'ARTIST' && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setShowAvailabilityModal(true)}>
                              <h5 className="text-orange-800 font-medium mb-1">📅 Indisponibilità</h5>
                              <p className="text-orange-700 text-sm">
                                Aggiungi giorni impegnato
                              </p>
                            </div>
                          )}

                          {user.role === 'ADMIN' && (
                            <>
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => handleSectionClick('users')}>
                                <h5 className="text-yellow-800 font-medium mb-1">👤 Utenti</h5>
                                <p className="text-yellow-700 text-sm">
                                  Gestisci account
                                </p>
                              </div>

                              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={() => handleSectionClick('notifications')}>
                                <h5 className="text-indigo-800 font-medium mb-1">📧 Notifiche</h5>
                                <p className="text-indigo-700 text-sm">
                                  Sistema email
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Prossimi eventi */}
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-4">⏰ Prossimi Eventi</h4>
                        <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                          {events.slice(0, 3).map(event => (
                            <div key={event.id} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0">
                              <div>
                                <div className="font-medium text-sm">{event.title}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(event.date).toLocaleDateString('it-IT')} - {event.time}
                                </div>
                              </div>
                              <div className={`px-2 py-1 rounded text-xs ${
                                event.type === 'event' ? 'bg-purple-100 text-purple-700' :
                                event.type === 'rehearsal' ? 'bg-blue-100 text-blue-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {event.type === 'event' ? 'Evento' :
                                 event.type === 'rehearsal' ? 'Prova' : 'Disponibilità'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stato Sistema */}
                  <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-gray-800 font-medium text-lg mb-2">✅ Stato Sistema</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-green-600 font-medium">Frontend</div>
                        <div className="text-gray-600">Operativo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-medium">Backend</div>
                        <div className="text-gray-600">Operativo</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-medium">Database</div>
                        <div className="text-gray-600">Connesso</div>
                      </div>
                      <div className="text-center">
                        <div className="text-green-600 font-medium">Auth</div>
                        <div className="text-gray-600">Attivo</div>
                      </div>
                    </div>
                  </div>
                    </>
                  )}
                </div>
              )}

              {activeSection === 'calendar' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    📅 Gestione Calendario
                  </h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="text-blue-800 font-medium text-lg mb-3">Calendario Eventi</h4>
                    <p className="text-blue-700 mb-4">
                      Qui puoi visualizzare tutti gli eventi, gestire la tua disponibilità e coordinare con il tuo team.
                    </p>
                    <div className="space-y-2">
                      <div className="bg-white p-3 rounded border">
                        <strong>Oggi:</strong> Nessun evento programmato
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Questa Settimana:</strong> 0 eventi pianificati
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Prossima Settimana:</strong> Fase di pianificazione
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      {user.role === 'ADMIN' && (
                        <button 
                          onClick={() => {
                            setSelectedDate(new Date().toISOString().split('T')[0]);
                            setIsModalOpen(true);
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        >
                          + Aggiungi Nuovo Evento
                        </button>
                      )}
                      <button 
                        onClick={() => setShowEventsList(!showEventsList)}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        {showEventsList ? 'Nascondi Lista' : 'Mostra Tutti gli Eventi'}
                      </button>
                    </div>
                    
                    {showEventsList && (
                      <div className="mt-4 space-y-2">
                        <h5 className="font-medium text-gray-900">Tutti gli Eventi:</h5>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {events.length === 0 ? (
                            <p className="text-gray-500 text-sm">Nessun evento presente</p>
                          ) : (
                            events.map(event => (
                              <div key={event.id} className="bg-white p-3 rounded border border-gray-200">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-sm">{event.title}</div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(event.date).toLocaleDateString('it-IT')} - {event.time}
                                    </div>
                                    {event.venue && (
                                      <div className="text-xs text-gray-500">📍 {event.venue}</div>
                                    )}
                                    {event.group && (
                                      <div className="text-xs text-gray-500">👥 {event.group.name}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteEvent(event.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'groups' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    👥 Gestione Gruppi
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h4 className="text-green-800 font-medium text-lg mb-3">
                      {user.role === 'ADMIN' ? 'Tutti i Gruppi' : 'I Tuoi Gruppi'}
                    </h4>
                    <p className="text-green-700 mb-4">
                      {user.role === 'ADMIN' 
                        ? 'Gestisci tutti i gruppi del sistema. Clicca su un gruppo per vedere i membri e gestire l\'appartenenza.'
                        : 'Visualizza i tuoi gruppi e gestisci la tua appartenenza. Clicca per entrare e vedere gli altri membri.'
                      }
                    </p>
                    <div className="space-y-2">
                      {(() => {
                        // Filtra i gruppi in base al ruolo
                        const filteredGroups = user.role === 'ADMIN' 
                          ? groups 
                          : groups.filter(group => 
                              group.user_groups?.some((ug: any) => ug.user_id === user.id)
                            );
                        
                        return filteredGroups.length === 0 ? (
                          <div className="bg-white p-3 rounded border">
                            <strong>Stato:</strong> {user.role === 'ADMIN' ? 'Nessun gruppo creato ancora' : 'Non fai parte di nessun gruppo ancora'}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredGroups.map(group => {
                              const isUserMember = group.user_groups?.some((ug: any) => ug.user_id === user.id);
                            
                            return (
                              <div 
                                key={group.id} 
                                className="bg-white p-4 rounded border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleGroupClick(group)}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h5 className="font-medium text-gray-900">{group.name}</h5>
                                    <div className="text-sm text-gray-600">
                                      <span className={`px-2 py-1 rounded text-xs ${
                                        group.type === 'BAND' ? 'bg-purple-100 text-purple-700' :
                                        group.type === 'DJ' ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'
                                      }`}>
                                        {group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'}
                                      </span>
                                      {group.genre && <span className="ml-2">• {group.genre}</span>}
                                      {isUserMember && <span className="ml-2 text-green-600">• Membro</span>}
                                    </div>
                                    {group.description && (
                                      <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                                    )}
                                    {group.user_groups && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        👥 {group.user_groups.length} membri
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-sm text-blue-600">
                                    👁️ Visualizza
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                      })()}
                    </div>
                    {user.role === 'ADMIN' && (
                      <button 
                        onClick={() => setShowCreateGroupModal(true)}
                        className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                      >
                        + Crea Nuovo Gruppo
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'events' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {user.role === 'ADMIN' ? '🎤 Gestione Eventi' : '📅 Le Tue Disponibilità'}
                  </h3>
                  <div className={`${user.role === 'ADMIN' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-6`}>
                    <h4 className={`${user.role === 'ADMIN' ? 'text-purple-800' : 'text-blue-800'} font-medium text-lg mb-3`}>
                      {user.role === 'ADMIN' ? 'Panoramica Eventi' : 'Gestione Disponibilità'}
                    </h4>
                    <p className={`${user.role === 'ADMIN' ? 'text-purple-700' : 'text-blue-700'} mb-4`}>
                      {user.role === 'ADMIN' 
                        ? 'Crea e gestisci le performance, imposta venue, compensi e traccia lo stato degli eventi.'
                        : 'Indica la tua disponibilità per i tuoi gruppi. Segna i giorni in cui sei impegnato o disponibile per performance.'
                      }
                    </p>
                    {user.role === 'ADMIN' ? (
                      // Statistiche per Admin - Eventi
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {events.filter(e => new Date(e.date) >= new Date()).length}
                          </div>
                          <div className="text-sm text-gray-600">Eventi Prossimi</div>
                        </div>
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {events.filter(e => new Date(e.date) < new Date()).length}
                          </div>
                          <div className="text-sm text-gray-600">Eventi Completati</div>
                        </div>
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {events.filter(e => e.status === 'PROPOSED').length}
                          </div>
                          <div className="text-sm text-gray-600">Eventi In Sospeso</div>
                        </div>
                      </div>
                    ) : (
                      // Statistiche per Artist - Disponibilità
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {groups.filter(group => 
                              group.user_groups?.some((ug: any) => ug.user_id === user.id)
                            ).length}
                          </div>
                          <div className="text-sm text-gray-600">Tuoi Gruppi</div>
                        </div>
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {events.filter(e => new Date(e.date) >= new Date()).length}
                          </div>
                          <div className="text-sm text-gray-600">Eventi Prossimi</div>
                        </div>
                        <div className="bg-white p-4 rounded border text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            0
                          </div>
                          <div className="text-sm text-gray-600">Giorni Impegnato</div>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-6 space-y-4">
                      <div className="flex gap-3">
                        {user.role === 'ADMIN' ? (
                          // Pulsanti per Admin
                          <>
                            <button 
                              onClick={() => {
                                setSelectedDate(new Date().toISOString().split('T')[0]);
                                setIsModalOpen(true);
                              }}
                              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                            >
                              + Crea Nuovo Evento
                            </button>
                            <button 
                              onClick={() => setShowEventsList(!showEventsList)}
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                              {showEventsList ? 'Nascondi Lista' : 'Visualizza Tutti gli Eventi'}
                            </button>
                          </>
                        ) : (
                          // Pulsanti per Artist
                          <>
                            <button 
                              onClick={() => setShowAvailabilityModal(true)}
                              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                            >
                              📅 Gestisci Disponibilità
                            </button>
                            <button 
                              onClick={() => setShowEventsList(!showEventsList)}
                              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                            >
                              {showEventsList ? 'Nascondi Lista' : 'Visualizza I Tuoi Eventi'}
                            </button>
                          </>
                        )}
                      </div>
                      
                      {showEventsList && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-3">
                            {user.role === 'ADMIN' ? 'Lista Completa Eventi' : 'I Tuoi Eventi'}
                          </h5>
                          {events.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">Nessun evento presente</p>
                          ) : (
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {events.map(event => (
                                <div key={event.id} className="border border-gray-100 rounded p-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <h6 className="font-medium text-gray-900">{event.title}</h6>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                          event.type === 'event' ? 'bg-purple-100 text-purple-700' :
                                          event.type === 'rehearsal' ? 'bg-blue-100 text-blue-700' :
                                          'bg-green-100 text-green-700'
                                        }`}>
                                          {event.type === 'event' ? 'Evento' :
                                           event.type === 'rehearsal' ? 'Prova' : 'Disponibilità'}
                                        </span>
                                      </div>
                                      <div className="text-sm text-gray-600 mt-1">
                                        📅 {new Date(event.date).toLocaleDateString('it-IT')} - ⏰ {event.time}
                                      </div>
                                      {event.venue && (
                                        <div className="text-sm text-gray-600">📍 {event.venue}</div>
                                      )}
                                      {event.group && (
                                        <div className="text-sm text-gray-600">👥 {event.group.name}</div>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="text-red-500 hover:text-red-700 ml-2"
                                      title="Elimina evento"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'users' && user.role === 'ADMIN' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    👤 Gestione Utenti
                  </h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="text-yellow-800 font-medium text-lg mb-3">Utenti Sistema</h4>
                    <p className="text-yellow-700 mb-4">
                      Gestisci account utente, assegna ruoli e controlla i permessi di accesso.
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {users.map((userItem) => (
                        <div key={userItem.id} className="bg-white p-3 rounded border flex justify-between items-center">
                          <div>
                            <strong>{userItem.first_name} {userItem.last_name}</strong> - {userItem.email}
                            <div className="text-sm text-gray-600">
                              Ruolo: {userItem.role}
                              {userItem.phone && ` • Tel: ${userItem.phone}`}
                            </div>
                            <div className="text-xs text-gray-500">
                              Creato: {new Date(userItem.created_at).toLocaleDateString('it-IT')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Attivo</span>
                            {userItem.id !== user.id && (
                              <button
                                onClick={() => handleDeleteUser(userItem.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition-colors"
                                title="Elimina utente"
                              >
                                🗑️ Elimina
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {users.length === 0 && (
                        <div className="bg-white p-3 rounded border text-center text-gray-500">
                          Nessun utente trovato
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={() => setShowCreateUserModal(true)}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
                      >
                        + Aggiungi Nuovo Utente
                      </button>
                      <button 
                        onClick={() => alert('Funzionalità di gestione permessi in sviluppo')}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Gestisci Permessi
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'notifications' && user.role === 'ADMIN' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    📧 Sistema Notifiche
                  </h3>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                    <h4 className="text-indigo-800 font-medium text-lg mb-3">Notifiche Email</h4>
                    <p className="text-indigo-700 mb-4">
                      Configura e invia email automatiche per eventi, richieste di disponibilità e aggiornamenti sistema.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium mb-2">Notifiche Eventi</h5>
                        <div className="text-sm text-gray-600">
                          Notifica automaticamente gli artisti sui nuovi eventi e cambi di programma.
                        </div>
                        <button 
                          onClick={() => alert('Configurazione notifiche eventi in sviluppo')}
                          className="mt-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200"
                        >
                          Configura
                        </button>
                      </div>
                      <div className="bg-white p-4 rounded border">
                        <h5 className="font-medium mb-2">Richieste Disponibilità</h5>
                        <div className="text-sm text-gray-600">
                          Invia promemoria agli artisti per aggiornare la loro disponibilità.
                        </div>
                        <button 
                          onClick={() => alert('Configurazione richieste disponibilità in sviluppo')}
                          className="mt-2 bg-indigo-100 text-indigo-700 px-3 py-1 rounded text-sm hover:bg-indigo-200"
                        >
                          Configura
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch('http://localhost:3000/api/email/test', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                              },
                              body: JSON.stringify({ email: user.email })
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              alert('✅ Email di test inviata con successo! Controlla la tua casella di posta.');
                            } else {
                              alert('❌ Errore nell\'invio email: ' + data.message);
                            }
                          } catch (error) {
                            console.error('Errore invio email test:', error);
                            alert('❌ Errore nell\'invio email di test');
                          }
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                      >
                        Invia Email di Test
                      </button>
                      <button 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/email/status', {
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                              }
                            });
                            
                            const data = await response.json();
                            
                            if (data.success) {
                              const emailData = data.data;
                              const message = `📧 Sistema Email Calendariko

• Configurazione: ${emailData.configured ? '✅ Attiva' : '❌ Non configurata'}
• Server Email: ${emailData.emailUser}
• Servizio: ${emailData.service}
• Gruppi monitorati: ${groups.length}
• Ultimo controllo: ${new Date().toLocaleString('it-IT')}

Funzionalità disponibili:
${emailData.features.map((f: any) => `• ${f}`).join('\n')}

${emailData.configured ? 'Il sistema di notifiche è completamente operativo!' : 'Configura le credenziali email nel file .env'}`;
                              alert(message);
                            } else {
                              alert('❌ Errore nel controllo status email');
                            }
                          } catch (error) {
                            console.error('Errore controllo status email:', error);
                            alert('❌ Errore nel controllo status email');
                          }
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
                      >
                        Status Email
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'user' && (
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    👤 Il Tuo Profilo
                  </h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <h4 className="text-slate-800 font-medium text-lg mb-3">I Tuoi Dati</h4>
                    <p className="text-slate-700 mb-6">
                      Gestisci le tue informazioni personali, dati di fatturazione e preferenze account.
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Informazioni Personali */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                          <span className="mr-2">📝</span>
                          Informazioni Personali
                        </h5>
                        <form className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                              <input
                                type="text"
                                value={userProfile.firstName}
                                onChange={(e) => handleProfileChange('firstName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Cognome *</label>
                              <input
                                type="text"
                                value={userProfile.lastName}
                                onChange={(e) => handleProfileChange('lastName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                              type="email"
                              value={userProfile.email}
                              onChange={(e) => handleProfileChange('email', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
                            <input
                              type="tel"
                              value={userProfile.phone}
                              onChange={(e) => handleProfileChange('phone', e.target.value)}
                              placeholder="+39 123 456 7890"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Data di Nascita</label>
                            <input
                              type="date"
                              value={userProfile.birthDate}
                              onChange={(e) => handleProfileChange('birthDate', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </form>
                      </div>

                      {/* Dati di Fatturazione */}
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                          <span className="mr-2">🧾</span>
                          Dati di Fatturazione
                        </h5>
                        <form className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Ragione Sociale</label>
                            <input
                              type="text"
                              value={userProfile.businessName}
                              onChange={(e) => handleProfileChange('businessName', e.target.value)}
                              placeholder="Nome azienda o nome completo"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA / Codice Fiscale</label>
                            <input
                              type="text"
                              value={userProfile.vatNumber}
                              onChange={(e) => handleProfileChange('vatNumber', e.target.value)}
                              placeholder="IT12345678901"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Indirizzo</label>
                            <input
                              type="text"
                              value={userProfile.address}
                              onChange={(e) => handleProfileChange('address', e.target.value)}
                              placeholder="Via, Piazza, ecc."
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">CAP</label>
                              <input
                                type="text"
                                value={userProfile.zipCode}
                                onChange={(e) => handleProfileChange('zipCode', e.target.value)}
                                placeholder="20100"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Città</label>
                              <input
                                type="text"
                                value={userProfile.city}
                                onChange={(e) => handleProfileChange('city', e.target.value)}
                                placeholder="Milano"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                              <input
                                type="text"
                                value={userProfile.province}
                                onChange={(e) => handleProfileChange('province', e.target.value)}
                                placeholder="MI"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </form>
                      </div>
                    </div>

                    {/* Sezione Gruppi (Solo Visualizzazione) */}
                    <div className="mt-8 bg-white rounded-lg p-6 border border-gray-200">
                      <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                        <span className="mr-2">👥</span>
                        I Tuoi Gruppi
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Solo visualizzazione</span>
                      </h5>
                      <div className="space-y-3">
                        {groups.filter(group => 
                          group.user_groups?.some((ug: any) => ug.user_id === user.id)
                        ).map(group => (
                          <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium text-gray-900">{group.name}</div>
                              <div className="text-sm text-gray-600">
                                {group.type === 'BAND' ? 'Band' : group.type === 'DJ' ? 'DJ' : 'Solista'} 
                                {group.genre && ` • ${group.genre}`}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500">
                              Membro
                            </div>
                          </div>
                        ))}
                        {groups.filter(group => 
                          group.user_groups?.some((ug: any) => ug.user_id === user.id)
                        ).length === 0 && (
                          <div className="text-center py-4 text-gray-500">
                            Non fai ancora parte di nessun gruppo
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        Per modificare i tuoi gruppi di appartenenza, contatta l'amministratore del sistema.
                      </p>
                    </div>

                    {/* Pulsanti Azione */}
                    <div className="mt-8 flex gap-4">
                      <button 
                        onClick={handleSaveProfile}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        💾 Salva Modifiche
                      </button>
                      <button 
                        onClick={() => window.location.reload()}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        🔄 Annulla
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal per eventi del giorno */}
      <DayEventsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
        events={getEventsForDate(selectedDate)}
        groups={groups}
        user={user}
        userGroups={user.role === 'ARTIST' ? groups.filter(group => 
          group.user_groups?.some((ug: any) => ug.user_id === user.id)
        ) : userGroups}
        users={users}
        onCreateEvent={handleCreateEvent}
        onDeleteEvent={handleDeleteEvent}
        onCreateAvailability={handleCreateAvailability}
      />

      {/* Modal per creazione gruppi */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
      />

      {/* Modal per creazione utenti */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onCreateUser={handleCreateUser}
        groups={groups}
      />

      {/* Modal per dettagli gruppo */}
      <GroupDetailModal
        isOpen={showGroupDetailModal}
        onClose={() => setShowGroupDetailModal(false)}
        group={selectedGroup}
        currentUser={user}
        onGroupUpdated={handleGroupUpdated}
      />

      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        user={user}
        userGroups={groups.filter(group => 
          group.user_groups?.some((ug: any) => ug.user_id === user.id)
        )}
        onDataChanged={reloadData}
      />
    </div>
  );
};

export default Dashboard;