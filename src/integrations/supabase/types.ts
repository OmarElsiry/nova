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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      channel_gifts: {
        Row: {
          channel_id: string | null
          created_at: string | null
          emoji: string | null
          gift_index: number | null
          id: string
          name: string | null
          sticker_base64: string | null
          value: number | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          emoji?: string | null
          gift_index?: number | null
          id?: string
          name?: string | null
          sticker_base64?: string | null
          value?: number | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          emoji?: string | null
          gift_index?: number | null
          id?: string
          name?: string | null
          sticker_base64?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "channel_gifts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_channel_gifts_channel_id"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_id: number | null
          channel_username: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          owner_first_name: string | null
          owner_id: number | null
          owner_last_name: string | null
          owner_username: string | null
        }
        Insert: {
          channel_id?: number | null
          channel_username: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          owner_first_name?: string | null
          owner_id?: number | null
          owner_last_name?: string | null
          owner_username?: string | null
        }
        Update: {
          channel_id?: number | null
          channel_username?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          owner_first_name?: string | null
          owner_id?: number | null
          owner_last_name?: string | null
          owner_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "channels_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          channel_id: string | null
          created_at: string | null
          id: string
          owner_id: number | null
          price: number
          status: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          owner_id?: number | null
          price: number
          status?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          id?: string
          owner_id?: number | null
          price?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_listings_channel_id"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          transaction_hash: string | null
          type: string
          user_id: number
          wallet_address: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          transaction_hash?: string | null
          type: string
          user_id: number
          wallet_address?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          transaction_hash?: string | null
          type?: string
          user_id?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_method: string | null
          created_at: string | null
          first_name: string | null
          id: number
          last_name: string | null
          telegram_hash: string | null
          telegram_verified: boolean | null
          username: string | null
          wallet_address: string | null
        }
        Insert: {
          auth_method?: string | null
          created_at?: string | null
          first_name?: string | null
          id: number
          last_name?: string | null
          telegram_hash?: string | null
          telegram_verified?: boolean | null
          username?: string | null
          wallet_address?: string | null
        }
        Update: {
          auth_method?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: number
          last_name?: string | null
          telegram_hash?: string | null
          telegram_verified?: boolean | null
          username?: string | null
          wallet_address?: string | null
        }
        Relationships: []
      }
      wallet_connections: {
        Row: {
          connection_type: string
          created_at: string
          id: string
          is_primary: boolean | null
          updated_at: string
          user_id: number
          wallet_address: string
        }
        Insert: {
          connection_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id: number
          wallet_address: string
        }
        Update: {
          connection_type?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
          user_id?: number
          wallet_address?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: number
          wallet_address: string | null
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: number
          wallet_address?: string | null
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: number
          wallet_address?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_telegram_user_id: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
