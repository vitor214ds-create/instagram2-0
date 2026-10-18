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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      brand_kits: {
        Row: {
          bio: string
          body_font: string
          brand_values: string
          created_at: string
          cta: string
          handle: string
          heading_font: string
          id: string
          logo_asset_id: string | null
          name: string
          palette: Json
          project_id: string
          slogan: string
          updated_at: string
          voice: string
        }
        Insert: {
          bio?: string
          body_font?: string
          brand_values?: string
          created_at?: string
          cta?: string
          handle?: string
          heading_font?: string
          id?: string
          logo_asset_id?: string | null
          name?: string
          palette?: Json
          project_id: string
          slogan?: string
          updated_at?: string
          voice?: string
        }
        Update: {
          bio?: string
          body_font?: string
          brand_values?: string
          created_at?: string
          cta?: string
          handle?: string
          heading_font?: string
          id?: string
          logo_asset_id?: string | null
          name?: string
          palette?: Json
          project_id?: string
          slogan?: string
          updated_at?: string
          voice?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_kits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_entries: {
        Row: {
          content_id: string | null
          created_at: string
          id: string
          notes: string
          project_id: string
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          id?: string
          notes?: string
          project_id: string
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          id?: string
          notes?: string
          project_id?: string
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_entries_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          caption: string
          created_at: string
          feed_position: number | null
          hashtags: string
          id: string
          project_id: string
          script: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          caption?: string
          created_at?: string
          feed_position?: number | null
          hashtags?: string
          id?: string
          project_id: string
          script?: string
          status?: string
          title?: string
          type: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          feed_position?: number | null
          hashtags?: string
          id?: string
          project_id?: string
          script?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_slides: {
        Row: {
          body: string
          content_id: string
          created_at: string
          heading: string
          id: string
          position: number
          project_id: string
        }
        Insert: {
          body?: string
          content_id: string
          created_at?: string
          heading?: string
          id?: string
          position?: number
          project_id: string
        }
        Update: {
          body?: string
          content_id?: string
          created_at?: string
          heading?: string
          id?: string
          position?: number
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_slides_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_slides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_documents: {
        Row: {
          content_id: string | null
          created_at: string
          height: number
          id: string
          layers: Json
          project_id: string
          updated_at: string
          width: number
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          height?: number
          id?: string
          layers?: Json
          project_id: string
          updated_at?: string
          width?: number
        }
        Update: {
          content_id?: string | null
          created_at?: string
          height?: number
          id?: string
          layers?: Json
          project_id?: string
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_documents_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          kind: string
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind: string
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          kind?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      highlights: {
        Row: {
          created_at: string
          icon: string
          id: string
          position: number
          project_id: string
          script: string
          title: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          position?: number
          project_id: string
          script?: string
          title: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          position?: number
          project_id?: string
          script?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          approved: boolean
          created_at: string
          id: string
          kind: string
          label: string
          project_id: string
          storage_path: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string
          project_id: string
          storage_path: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          id?: string
          kind?: string
          label?: string
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      name_suggestions: {
        Row: {
          category: string | null
          created_at: string
          favorite: boolean
          handle: string | null
          id: string
          kind: string
          project_id: string
          source: string
          value: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          favorite?: boolean
          handle?: string | null
          id?: string
          kind: string
          project_id: string
          source?: string
          value: string
        }
        Update: {
          category?: string | null
          created_at?: string
          favorite?: boolean
          handle?: string | null
          id?: string
          kind?: string
          project_id?: string
          source?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "name_suggestions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          audience: string
          brief: string
          created_at: string
          cta_link: string
          id: string
          language: string
          niche: string
          objective: string
          owner_id: string
          product: string
          status: string
          timezone: string
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          audience?: string
          brief?: string
          created_at?: string
          cta_link?: string
          id?: string
          language?: string
          niche?: string
          objective?: string
          owner_id?: string
          product?: string
          status?: string
          timezone?: string
          title: string
          tone?: string
          updated_at?: string
        }
        Update: {
          audience?: string
          brief?: string
          created_at?: string
          cta_link?: string
          id?: string
          language?: string
          niche?: string
          objective?: string
          owner_id?: string
          product?: string
          status?: string
          timezone?: string
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      owns_project: { Args: { _project_id: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
