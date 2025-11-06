export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'ADMIN' | 'ARTIST';
  avatar_url?: string;
  created_at: string;
  user_groups?: UserGroup[];
}

export interface Group {
  id: string;
  name: string;
  type: 'BAND' | 'DJ' | 'SOLO';
  description?: string;
  genre?: string;
  logo_url?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
  updated_at: string;
  user_groups?: UserGroup[];
  events?: Event[];
}

export interface UserGroup {
  id: string;
  user_id: string;
  group_id: string;
  joined_at: string;
  user?: User;
  group?: Group;
}

export interface Event {
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
  status: 'PROPOSED' | 'CONFIRMED' | 'CANCELLED';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  group?: Group;
  creator?: User;
}

export interface Availability {
  id: string;
  user_id: string;
  group_id: string;
  date: string;
  type: 'AVAILABLE' | 'UNAVAILABLE';
  notes?: string;
  created_at: string;
  updated_at: string;
  user?: User;
  group?: Group;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error: string;
}