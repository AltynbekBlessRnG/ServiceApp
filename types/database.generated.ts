export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: number
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_id: string
          created_at: string
          ends_at: string | null
          guest_count: number | null
          id: string
          kind: Database["public"]["Enums"]["booking_kind"]
          message: string | null
          provider_id: string
          service_id: number | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          ends_at?: string | null
          guest_count?: number | null
          id?: string
          kind: Database["public"]["Enums"]["booking_kind"]
          message?: string | null
          provider_id: string
          service_id?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          ends_at?: string | null
          guest_count?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["booking_kind"]
          message?: string | null
          provider_id?: string
          service_id?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          created_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          category_id: number | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["conversation_kind"]
        }
        Insert: {
          category_id?: number | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["conversation_kind"]
        }
        Update: {
          category_id?: number | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["conversation_kind"]
        }
        Relationships: [
          {
            foreignKeyName: "conversations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          target_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          target_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          target_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_hidden: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_items: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          in_feed: boolean
          is_hero: boolean
          is_hidden: boolean
          is_pinned: boolean
          owner_id: string
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          file_type?: string
          file_url: string
          id?: string
          in_feed?: boolean
          is_hero?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          owner_id: string
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          in_feed?: boolean
          is_hero?: boolean
          is_hidden?: boolean
          is_pinned?: boolean
          owner_id?: string
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_likes: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_likes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "portfolio_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          is_banned: boolean
          role: Database["public"]["Enums"]["account_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          is_banned?: boolean
          role?: Database["public"]["Enums"]["account_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_banned?: boolean
          role?: Database["public"]["Enums"]["account_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      provider_blocks: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          provider_id: string
          reason: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          provider_id: string
          reason?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          provider_id?: string
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_blocks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_blocks_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_services: {
        Row: {
          created_at: string
          price_from: number | null
          provider_id: string
          service_id: number
        }
        Insert: {
          created_at?: string
          price_from?: number | null
          provider_id: string
          service_id: number
        }
        Update: {
          created_at?: string
          price_from?: number | null
          provider_id?: string
          service_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "provider_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_verifications: {
        Row: {
          provider_id: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["provider_verification_status"]
          submitted_at: string
        }
        Insert: {
          provider_id: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["provider_verification_status"]
          submitted_at?: string
        }
        Update: {
          provider_id?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["provider_verification_status"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verifications_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reporter_id: string
          resolution_note: string | null
          status: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reporter_id: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reporter_id?: string
          resolution_note?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string
          comment: string | null
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
          target_id: string
        }
        Insert: {
          booking_id: string
          client_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
          target_id: string
        }
        Update: {
          booking_id?: string
          client_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      service_categories: {
        Row: {
          icon: string
          id: number
          is_active: boolean
          name: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string
          id?: number
          is_active?: boolean
          name: string
          provider_type: Database["public"]["Enums"]["provider_type"]
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string
          id?: number
          is_active?: boolean
          name?: string
          provider_type?: Database["public"]["Enums"]["provider_type"]
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: number
          icon: string
          id: number
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          category_id: number
          icon?: string
          id?: number
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          category_id?: number
          icon?: string
          id?: number
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_profiles: {
        Row: {
          bio: string | null
          created_at: string
          experience_years: number
          id: string
          price_start: number
          service_area: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          experience_years?: number
          id: string
          price_start?: number
          service_area?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          experience_years?: number
          id?: string
          price_start?: number
          service_area?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_profiles: {
        Row: {
          address: string | null
          capacity: number
          created_at: string
          description: string | null
          distance_to_beach_m: number | null
          family_friendly: boolean
          has_meals: boolean
          has_parking: boolean
          has_wifi: boolean
          id: string
          location_zone: string | null
          pet_friendly: boolean
          price_from: number
          season_close: string | null
          season_open: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          capacity?: number
          created_at?: string
          description?: string | null
          distance_to_beach_m?: number | null
          family_friendly?: boolean
          has_meals?: boolean
          has_parking?: boolean
          has_wifi?: boolean
          id: string
          location_zone?: string | null
          pet_friendly?: boolean
          price_from?: number
          season_close?: string | null
          season_open?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          capacity?: number
          created_at?: string
          description?: string | null
          distance_to_beach_m?: number | null
          family_friendly?: boolean
          has_meals?: boolean
          has_parking?: boolean
          has_wifi?: boolean
          id?: string
          location_zone?: string | null
          pet_friendly?: boolean
          price_from?: number
          season_close?: string | null
          season_open?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "provider_search_view"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      provider_search_view: {
        Row: {
          avatar_url: string | null
          avg_rating: number | null
          capacity: number | null
          category_name: string | null
          category_slug: string | null
          city: string | null
          distance_to_beach_m: number | null
          experience_years: number | null
          full_name: string | null
          id: string | null
          latitude: number | null
          location_zone: string | null
          longitude: number | null
          price_from: number | null
          provider_type: string | null
          review_count: number | null
          service_area: string | null
          service_id: number | null
          service_name: string | null
          service_slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_review_provider: {
        Args: {
          p_note?: string
          p_provider_id: string
          p_status: Database["public"]["Enums"]["provider_verification_status"]
        }
        Returns: undefined
      }
      admin_set_user_banned: {
        Args: { p_banned: boolean; p_user_id: string }
        Returns: undefined
      }
      consume_ai_quota: { Args: never; Returns: boolean }
      create_appointment: {
        Args: {
          p_message?: string
          p_provider_id: string
          p_service_id: number
          p_starts_at: string
        }
        Returns: string
      }
      create_stay_booking: {
        Args: {
          p_ends_at: string
          p_guest_count: number
          p_message?: string
          p_starts_at: string
          p_venue_id: string
        }
        Returns: string
      }
      get_my_chats: {
        Args: never
        Returns: {
          avatar_url: string
          conversation_id: string
          full_name: string
          last_message: string
          last_message_time: string
          partner_id: string
        }[]
      }
      get_my_private_profile: {
        Args: never
        Returns: {
          phone: string
        }[]
      }
      get_or_create_direct_conversation: {
        Args: { p_partner_id: string }
        Returns: string
      }
      get_provider_unavailable_intervals: {
        Args: { p_from: string; p_provider_id: string; p_to: string }
        Returns: {
          ends_at: string
          starts_at: string
        }[]
      }
      get_push_tokens: {
        Args: { p_user_id: string }
        Returns: {
          platform: string
          token: string
        }[]
      }
      get_venue_location: {
        Args: { p_provider_id: string }
        Returns: {
          is_public: boolean
          latitude: number
          longitude: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_member: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
      mark_conversation_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      moderate_report: {
        Args: { p_action: string; p_note?: string; p_report_id: string }
        Returns: undefined
      }
      register_device_token: {
        Args: { p_platform: string; p_token: string }
        Returns: undefined
      }
      replace_my_provider_services: {
        Args: {
          p_category_id: number
          p_price_from?: number
          p_service_ids: number[]
        }
        Returns: undefined
      }
      search_providers: {
        Args: {
          p_category_slug?: string
          p_city?: string
          p_latitude?: number
          p_longitude?: number
          p_max_price?: number
          p_provider_type?: Database["public"]["Enums"]["provider_type"]
          p_service_slug?: string
          p_sort?: string
        }
        Returns: {
          avatar_url: string
          avg_rating: number
          capacity: number
          category_name: string
          category_slug: string
          city: string
          distance_km: number
          distance_to_beach_m: number
          experience_years: number
          full_name: string
          id: string
          latitude: number
          location_zone: string
          longitude: number
          price_from: number
          provider_type: string
          review_count: number
          service_area: string
          service_id: number
          service_name: string
          service_slug: string
        }[]
      }
      set_initial_role: {
        Args: {
          p_city?: string
          p_role: Database["public"]["Enums"]["account_role"]
        }
        Returns: undefined
      }
      set_my_portfolio_hero: { Args: { p_item_id: string }; Returns: undefined }
      submit_my_provider_verification: {
        Args: never
        Returns: Database["public"]["Enums"]["provider_verification_status"]
      }
      transition_booking: {
        Args: {
          p_booking_id: string
          p_status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: {
          client_id: string
          created_at: string
          ends_at: string | null
          guest_count: number | null
          id: string
          kind: Database["public"]["Enums"]["booking_kind"]
          message: string | null
          provider_id: string
          service_id: number | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unregister_device_token: { Args: { p_token: string }; Returns: undefined }
      update_my_private_profile: {
        Args: { p_phone: string }
        Returns: undefined
      }
      update_my_venue_location: {
        Args: { p_is_public: boolean; p_latitude: number; p_longitude: number }
        Returns: undefined
      }
    }
    Enums: {
      account_role: "client" | "specialist" | "venue"
      booking_kind: "appointment" | "stay"
      booking_status:
        | "pending"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
      conversation_kind: "direct" | "category"
      provider_type: "specialist" | "venue"
      provider_verification_status: "pending" | "approved" | "rejected"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_role: ["client", "specialist", "venue"],
      booking_kind: ["appointment", "stay"],
      booking_status: [
        "pending",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
      ],
      conversation_kind: ["direct", "category"],
      provider_type: ["specialist", "venue"],
      provider_verification_status: ["pending", "approved", "rejected"],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
    },
  },
} as const
