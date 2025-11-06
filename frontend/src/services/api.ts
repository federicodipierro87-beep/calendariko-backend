import axios from 'axios';
import { AuthResponse, User, Group, Event, Availability } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post('/auth/login', { email, password }).then((res) => res.data),
  
  logout: () => api.post('/auth/logout'),
  
  register: (userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
    role?: 'ADMIN' | 'ARTIST';
  }): Promise<User> =>
    api.post('/auth/register', userData).then((res) => res.data),
};

export const userApi = {
  getAll: (): Promise<User[]> =>
    api.get('/users').then((res) => res.data),
  
  getById: (id: string): Promise<User> =>
    api.get(`/users/${id}`).then((res) => res.data),
  
  update: (id: string, data: Partial<User>): Promise<User> =>
    api.put(`/users/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/users/${id}`),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/users/change-password', { currentPassword, newPassword }),
};

export const groupApi = {
  getAll: (): Promise<Group[]> =>
    api.get('/groups').then((res) => res.data),
  
  getById: (id: string): Promise<Group> =>
    api.get(`/groups/${id}`).then((res) => res.data),
  
  getUserGroups: (): Promise<{ group: Group }[]> =>
    api.get('/groups/my-groups').then((res) => res.data),
  
  create: (data: Omit<Group, 'id' | 'created_at' | 'updated_at'>): Promise<Group> =>
    api.post('/groups', data).then((res) => res.data),
  
  update: (id: string, data: Partial<Group>): Promise<Group> =>
    api.put(`/groups/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/groups/${id}`),
  
  addMember: (groupId: string, userId: string) =>
    api.post(`/groups/${groupId}/members`, { userId }),
  
  removeMember: (groupId: string, userId: string) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
};

export const eventApi = {
  getAll: (params?: { start?: string; end?: string; groupId?: string }): Promise<Event[]> =>
    api.get('/events', { params }).then((res) => res.data),
  
  getById: (id: string): Promise<Event> =>
    api.get(`/events/${id}`).then((res) => res.data),
  
  create: (data: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<Event> =>
    api.post('/events', data).then((res) => res.data),
  
  update: (id: string, data: Partial<Event>): Promise<Event> =>
    api.put(`/events/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/events/${id}`),
};

export const availabilityApi = {
  get: (params: { userId?: string; groupId?: string; start?: string; end?: string }): Promise<Availability[]> =>
    api.get('/availability', { params }).then((res) => res.data),
  
  create: (data: Omit<Availability, 'id' | 'created_at' | 'updated_at'>): Promise<Availability> =>
    api.post('/availability', data).then((res) => res.data),
  
  update: (id: string, data: Partial<Availability>): Promise<Availability> =>
    api.put(`/availability/${id}`, data).then((res) => res.data),
  
  delete: (id: string) =>
    api.delete(`/availability/${id}`),
};

export default api;