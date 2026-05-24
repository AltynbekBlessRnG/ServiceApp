export type UserRole = 'client' | 'specialist' | 'venue' | 'admin';

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole | null;
  city: string | null;
  phone: string | null;
  push_token: string | null;
  balance: number;
  is_admin: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  type: 'specialist' | 'venue';
  image_url: string | null;
  bg_color: string | null;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
}

export interface SpecialistProfile {
  id: string;
  bio: string | null;
  experience_years: number;
  price_start: number;
  category_id: number | null;
  profiles?: Profile;
  categories?: Category;
}

export interface VenueProfile {
  id: string;
  description: string | null;
  address: string | null;
  capacity: number;
  latitude: number | null;
  longitude: number | null;
  category_id: number | null;
  profiles?: Profile;
  categories?: Category;
}

export interface Review {
  id: string;
  client_id: string;
  target_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  client?: Profile;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface FavoriteItem {
  id: string;
  target_id: string;
  user_id: string;
  specialist_profiles?: SpecialistProfile;
  venue_profiles?: VenueProfile;
}

export interface PortfolioItem {
  id: string;
  specialist_id: string;
  file_url: string;
  thumbnail_url: string | null;
  file_type: 'image' | 'video';
  in_feed: boolean;
  is_pinned: boolean;
  is_hero: boolean;
  created_at: string;
}

export interface CategoryMessage {
  id: string;
  category_id: number;
  sender_id: string;
  content: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface BusyTime {
  id: string;
  specialist_id: string;
  date: string;
  time: string;
  created_at: string;
}
