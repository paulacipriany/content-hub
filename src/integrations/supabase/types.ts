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
      commemorative_dates: {
        Row: {
          created_at: string
          created_by: string
          date: string
          id: string
          project_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          id?: string
          project_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          id?: string
          project_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "commemorative_dates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content_id: string
          created_at: string
          id: string
          image_url: string | null
          text: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          text: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
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
      content_approvers: {
        Row: {
          content_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_approvers_content_id_fkey"
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
          briefing_images: string[] | null
          content_type: Database["public"]["Enums"]["content_type"]
          copy_text: string | null
          copy_texts: Json | null
          created_at: string
          created_by: string
          description: string | null
          hashtags: string[] | null
          id: string
          media_url: string | null
          media_urls: string[] | null
          platform: Database["public"]["Enums"]["platform"][]
          project_id: string
          publish_date: string | null
          publish_time: string | null
          status: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          briefing_images?: string[] | null
          content_type?: Database["public"]["Enums"]["content_type"]
          copy_text?: string | null
          copy_texts?: Json | null
          created_at?: string
          created_by: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          media_urls?: string[] | null
          platform?: Database["public"]["Enums"]["platform"][]
          project_id: string
          publish_date?: string | null
          publish_time?: string | null
          status?: Database["public"]["Enums"]["workflow_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          briefing_images?: string[] | null
          content_type?: Database["public"]["Enums"]["content_type"]
          copy_text?: string | null
          copy_texts?: Json | null
          created_at?: string
          created_by?: string
          description?: string | null
          hashtags?: string[] | null
          id?: string
          media_url?: string | null
          media_urls?: string[] | null
          platform?: Database["public"]["Enums"]["platform"][]
          project_id?: string
          publish_date?: string | null
          publish_time?: string | null
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
      media_library: {
        Row: {
          content_id: string | null
          created_at: string
          filename: string
          id: string
          project_id: string
          uploaded_by: string
          url: string
        }
        Insert: {
          content_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          project_id: string
          uploaded_by: string
          url: string
        }
        Update: {
          content_id?: string | null
          created_at?: string
          filename?: string
          id?: string
          project_id?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_library_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_library_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      post_analyses: {
        Row: {
          analysis_text: string | null
          comments_count: number | null
          content_id: string
          created_at: string
          created_by: string
          id: string
          likes: number | null
          platform_metrics: Json | null
          result: string | null
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          analysis_text?: string | null
          comments_count?: number | null
          content_id: string
          created_at?: string
          created_by: string
          id?: string
          likes?: number | null
          platform_metrics?: Json | null
          result?: string | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          analysis_text?: string | null
          comments_count?: number | null
          content_id?: string
          created_at?: string
          created_by?: string
          id?: string
          likes?: number | null
          platform_metrics?: Json | null
          result?: string | null
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analyses_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: true
            referencedRelation: "contents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved: boolean
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_platform_profiles: {
        Row: {
          created_at: string
          id: string
          platform: string
          profile_url: string | null
          project_id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          profile_url?: string | null
          project_id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          profile_url?: string | null
          project_id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_platform_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          done: boolean
          due_date: string | null
          id: string
          list_id: string | null
          priority: string | null
          project_id: string
          sort_order: number
          status: string | null
          text: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          done?: boolean
          due_date?: string | null
          id?: string
          list_id?: string | null
          priority?: string | null
          project_id: string
          sort_order?: number
          status?: string | null
          text: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          done?: boolean
          due_date?: string | null
          id?: string
          list_id?: string | null
          priority?: string | null
          project_id?: string
          sort_order?: number
          status?: string | null
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "task_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          platforms: Database["public"]["Enums"]["platform"][]
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          platforms?: Database["public"]["Enums"]["platform"][]
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          platforms?: Database["public"]["Enums"]["platform"][]
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          done: boolean
          due_date: string | null
          id: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          due_date?: string | null
          id?: string
          text?: string
          user_id?: string
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
      task_lists: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          sort_order?: number
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_lists_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      content_type:
        | "feed"
        | "reels"
        | "stories"
        | "carousel"
        | "video"
        | "post"
        | "shorts"
        | "image"
      platform:
        | "instagram"
        | "facebook"
        | "linkedin"
        | "tiktok"
        | "youtube"
        | "pinterest"
        | "twitter"
        | "google_business"
        | "blog"
      workflow_status:
        | "idea"
        | "production"
        | "review"
        | "approval-internal"
        | "approval-client"
        | "scheduled"
        | "published"
        | "idea-bank"
        | "programmed"
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
      content_type: [
        "feed",
        "reels",
        "stories",
        "carousel",
        "video",
        "post",
        "shorts",
        "image",
      ],
      platform: [
        "instagram",
        "facebook",
        "linkedin",
        "tiktok",
        "youtube",
        "pinterest",
        "twitter",
        "google_business",
        "blog",
      ],
      workflow_status: [
        "idea",
        "production",
        "review",
        "approval-internal",
        "approval-client",
        "scheduled",
        "published",
        "idea-bank",
        "programmed",
      ],
    },
  },
} as const
