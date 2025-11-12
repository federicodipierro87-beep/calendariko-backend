// Utility per gestire le chiamate API con refresh automatico del token

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Funzione per effettuare il refresh del token
const refreshToken = async (): Promise<string | null> => {
  try {
    const refreshTokenValue = localStorage.getItem('refreshToken');
    console.log('Tentativo di refresh con token:', refreshTokenValue ? 'presente' : 'mancante');
    
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: refreshTokenValue }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('Refresh failed:', response.status, errorData);
      throw new Error(`Failed to refresh token: ${errorData.error}`);
    }

    const data = await response.json();
    console.log('Refresh completato con successo');
    
    // Salva i nuovi token
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data.accessToken;
  } catch (error) {
    console.error('Errore durante il refresh:', error);
    // Se il refresh fallisce, rimuovi tutti i token e forza il logout
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
    window.location.reload();
    return null;
  }
};

// Funzione per effettuare chiamate API con gestione automatica del token
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // Aggiungi il token di autorizzazione
  let accessToken = localStorage.getItem('accessToken');
  console.log('Chiamata API a:', url, 'con token:', accessToken ? `presente (${accessToken.substring(0, 20)}...)` : 'mancante');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as any)['Authorization'] = `Bearer ${accessToken}`;
  }

  const requestOptions = {
    ...options,
    headers,
  };

  try {
    let response = await fetch(url, requestOptions);
    console.log('Risposta API:', response.status, response.statusText);

    // Se ricevo 401 (token scaduto), provo a fare il refresh
    if (response.status === 401) {
      console.log('Token scaduto, tentativo di refresh...');
      
      const newAccessToken = await refreshToken();
      if (newAccessToken) {
        console.log('Nuovo token ottenuto, riprovo la chiamata...');
        // Riprovo la chiamata con il nuovo token
        (requestOptions.headers as any)['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, requestOptions);
        console.log('Seconda risposta API:', response.status, response.statusText);
      } else {
        throw new ApiError(401, 'Authentication failed');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('API Error:', response.status, errorData);
      console.error('Full error details:', JSON.stringify(errorData, null, 2));
      throw new ApiError(response.status, errorData.error || errorData.message || 'Request failed');
    }

    const responseData = await response.json();
    console.log('API Success:', responseData);
    return responseData;
  } catch (error) {
    console.error('API Call Error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : 'Network error');
  }
};

// Funzioni specifiche per le API
export const groupsApi = {
  getAll: () => apiCall('/groups'),
  getPublic: () => apiCall('/auth/public-groups'),
  getUserGroups: () => apiCall('/groups/my-groups'),
  create: (groupData: any) => apiCall('/groups', {
    method: 'POST',
    body: JSON.stringify(groupData),
  }),
  getById: (id: string) => apiCall(`/groups/${id}`),
  addMember: (groupId: string, userId: string) => apiCall(`/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId: userId }),
  }),
  removeMember: (groupId: string, userId: string) => apiCall(`/groups/${groupId}/members/${userId}`, {
    method: 'DELETE',
  }),
  joinGroup: (groupId: string) => apiCall(`/groups/${groupId}/join`, {
    method: 'POST',
  }),
  leaveGroup: (groupId: string) => apiCall(`/groups/${groupId}/leave`, {
    method: 'DELETE',
  }),
  delete: (groupId: string) => apiCall(`/groups/${groupId}`, {
    method: 'DELETE',
  }),
};

export const eventsApi = {
  getAll: () => apiCall('/events'),
  create: (eventData: any) => apiCall('/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),
  getById: (id: string) => apiCall(`/events/${id}`),
  update: (id: string, eventData: any) => apiCall(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  }),
  delete: (id: string) => apiCall(`/events/${id}`, {
    method: 'DELETE',
  }),
};

export const authApi = {
  login: (credentials: any) => apiCall('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),
  publicRegister: (userData: any) => apiCall('/auth/public-register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  refresh: (refreshToken: string) => apiCall('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }),
};

export const usersApi = {
  create: (userData: any) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  }),
  getAll: () => apiCall('/users'),
  getById: (id: string) => apiCall(`/users/${id}`),
  update: (id: string, userData: any) => apiCall(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
  }),
  delete: (id: string) => apiCall(`/users/${id}`, {
    method: 'DELETE',
  }),
  unlock: (id: string) => apiCall(`/users/${id}/unlock`, {
    method: 'POST',
  }),
};

export const availabilityApi = {
  getAvailability: (params: { userId?: string; groupId?: string; start?: string; end?: string }) => {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.append('userId', params.userId);
    if (params.groupId) searchParams.append('groupId', params.groupId);
    if (params.start) searchParams.append('start', params.start);
    if (params.end) searchParams.append('end', params.end);
    
    return apiCall(`/availability?${searchParams.toString()}`);
  },
  createAvailability: (availabilityData: any) => apiCall('/availability', {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  }),
  createBulkAvailability: (availabilityData: any) => apiCall('/availability/bulk', {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  }),
  updateAvailability: (id: string, availabilityData: any) => apiCall(`/availability/${id}`, {
    method: 'PUT',
    body: JSON.stringify(availabilityData),
  }),
  deleteAvailability: (id: string) => apiCall(`/availability/${id}`, {
    method: 'DELETE',
  }),
  getGroupAvailabilityOverview: (groupId: string) => apiCall(`/availability/group/${groupId}/overview`),
};