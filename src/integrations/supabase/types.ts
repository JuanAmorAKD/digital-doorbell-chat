export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      apartments: {
        Row: {
          apartment_number: string
          building_id: string
          created_at: string
          id: string
          resident_name: string | null
        }
        Insert: {
          apartment_number: string
          building_id: string
          created_at?: string
          id?: string
          resident_name?: string | null
        }
        Update: {
          apartment_number?: string
          building_id?: string
          created_at?: string
          id?: string
          resident_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apartments_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      doorbells: {
        Row: {
          apartment_id: string | null
          created_at: string
          enabled: boolean
          id: string
          name: string
          qr_code_enabled: boolean
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          apartment_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name: string
          qr_code_enabled?: boolean
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          apartment_id?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          qr_code_enabled?: boolean
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doorbells_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: true
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          notification_id: string
          sender: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          notification_id: string
          sender: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          notification_id?: string
          sender?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          doorbell_id: string
          id: string
          status: string
          visitor_message: string | null
          visitor_name: string
        }
        Insert: {
          created_at?: string
          doorbell_id: string
          id?: string
          status?: string
          visitor_message?: string | null
          visitor_name: string
        }
        Update: {
          created_at?: string
          doorbell_id?: string
          id?: string
          status?: string
          visitor_message?: string | null
          visitor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_doorbell_id_fkey"
            columns: ["doorbell_id"]
            isOneToOne: false
            referencedRelation: "doorbells"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_admin: boolean | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          is_admin?: boolean | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_admin?: boolean | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
