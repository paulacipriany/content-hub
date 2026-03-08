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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      approvals: {
        Row: {
          comment: string | null
          content_id: string
          created_at: string
          decision: string
          id: string
          reviewer_id: string
        }
        Insert: {
          comment?: string | null
          content_id: string
          created_at?: string
          decision: string
          id?: string
          reviewer_id: string
        }
        Update: {
          comment?: string | null
          content_id?: string
          created_at?: string
          decision?: string
          id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          content_id: string
          created_at: string
          done: boolean
          id: string
          sort_order: number
          text: string
        }
        Insert: {
          content_id: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text: string
        }
        Update: {
          content_id?: string
          created_at?: string
          done?: boolean
          id?: string
          sort_order?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content_id: string
          created_at: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      contents: {
        Row: {
          assignee_id: string | null
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string
          description: string | null
          hashtags: string[] | null
          id: string
          media_url: string | null
          platform: Database["public"]["Enums"]["platform"]
          project_id: string
          publish_date: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          project_id: string
          publish_date?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          project_id?: string
          publish_date?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      status_history: {
        Row: {
          changed_by: string
          content_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["workflow_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["workflow_status"]
        }
        Insert: {
          changed_by: string
          content_id: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["workflow_status"] | null
          id?: string
          to_status: Database["public"]["Enums"]["workflow_status"]
        }
        Update: {
          changed_by?: string
          content_id?: string
          created_at?: string
          from_status?: Database["public"]["Enums"]["workflow_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["workflow_status"]
        }
        Relationships: [
          {
            foreignKeyName: "status_history_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "social_media" | "client"
      content_type: "feed" | "reels" | "stories" | "carousel" | "video"
      platform: "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube"
      workflow_status:
        | "idea"
        | "production"
        | "review"
        | "approval-internal"
        | "approval-client"
        | "scheduled"
        | "published"
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
    Enums: {
      app_role: ["admin", "moderator", "social_media", "client"],
      content_type: ["feed", "reels", "stories", "carousel", "video"],
      platform: ["instagram", "facebook", "linkedin", "tiktok", "youtube"],
      workflow_status: [
        "idea",
        "production",
        "review",
        "approval-internal",
        "approval-client",
        "scheduled",
        "published",
      ],
    },
  },
} as const
