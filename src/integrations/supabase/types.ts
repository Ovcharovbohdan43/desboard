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
      expense_categories: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      income_sources: {
        Row: {
          created_at: string
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_sources_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          team_id: string
          name: string
          contact_name: string | null
          email: string | null
          status: string | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          contact_name?: string | null
          email?: string | null
          status?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          contact_name?: string | null
          email?: string | null
          status?: string | null
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "clients_team_id_fkey", columns: ["team_id"], referencedRelation: "teams", referencedColumns: ["id"] }]
      }
      projects: {
        Row: {
          id: string
          team_id: string
          client_id: string | null
          name: string
          slug: string | null
          status: string
          progress: number
          deadline: string | null
          description: string
          budget: number
          spent: number
          color: string
          handoff_status: string | null
          handoff_rating: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          client_id?: string | null
          name: string
          slug?: string | null
          status?: string
          progress?: number
          deadline?: string | null
          description?: string
          budget?: number
          spent?: number
          color?: string
          handoff_status?: string | null
          handoff_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          client_id?: string | null
          name?: string
          slug?: string | null
          status?: string
          progress?: number
          deadline?: string | null
          description?: string
          budget?: number
          spent?: number
          color?: string
          handoff_status?: string | null
          handoff_rating?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "projects_team_id_fkey", columns: ["team_id"], referencedRelation: "teams", referencedColumns: ["id"] },
          { foreignKeyName: "projects_client_id_fkey", columns: ["client_id"], referencedRelation: "clients", referencedColumns: ["id"] },
        ]
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string
          status: string
          priority: string
          assignee_id: string | null
          due_date: string | null
          tags: string[]
          comments_count: number
          attachments_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          tags?: string[]
          comments_count?: number
          attachments_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string
          status?: string
          priority?: string
          assignee_id?: string | null
          due_date?: string | null
          tags?: string[]
          comments_count?: number
          attachments_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "tasks_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      milestones: {
        Row: {
          id: string
          project_id: string
          title: string
          due_date: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          due_date?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          due_date?: string | null
          completed?: boolean
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "milestones_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      project_files: {
        Row: {
          id: string
          project_id: string
          name: string
          type: string
          size_bytes: number
          storage_path: string
          added_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          type: string
          size_bytes?: number
          storage_path: string
          added_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          type?: string
          size_bytes?: number
          storage_path?: string
          added_by?: string
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "project_files_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      file_folders: {
        Row: {
          id: string
          team_id: string
          name: string
          parent_id: string | null
          color: string
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          parent_id?: string | null
          color?: string
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          parent_id?: string | null
          color?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "file_folders_team_id_fkey", columns: ["team_id"], referencedRelation: "teams", referencedColumns: ["id"] },
          { foreignKeyName: "file_folders_parent_id_fkey", columns: ["parent_id"], referencedRelation: "file_folders", referencedColumns: ["id"] }
        ]
      }
      files: {
        Row: {
          id: string
          folder_id: string
          project_id: string | null
          name: string
          type: string
          size_bytes: number
          storage_path: string
          added_by: string | null
          version: number
          starred: boolean
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          folder_id: string
          project_id?: string | null
          name: string
          type?: string
          size_bytes?: number
          storage_path: string
          added_by?: string | null
          version?: number
          starred?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          folder_id?: string
          project_id?: string | null
          name?: string
          type?: string
          size_bytes?: number
          storage_path?: string
          added_by?: string | null
          version?: number
          starred?: boolean
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "files_folder_id_fkey", columns: ["folder_id"], referencedRelation: "file_folders", referencedColumns: ["id"] },
          { foreignKeyName: "files_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }
        ]
      }
      deliverables: {
        Row: {
          id: string
          project_id: string
          label: string
          completed: boolean
          due_date: string | null
          status: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          label: string
          completed?: boolean
          due_date?: string | null
          status?: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          label?: string
          completed?: boolean
          due_date?: string | null
          status?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "deliverables_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      handoff_versions: {
        Row: {
          id: string
          project_id: string
          version: string
          notes: string
          files_count: number
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          project_id: string
          version: string
          notes?: string
          files_count?: number
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          version?: string
          notes?: string
          files_count?: number
          created_at?: string
          created_by?: string | null
        }
        Relationships: [{ foreignKeyName: "handoff_versions_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      client_messages: {
        Row: {
          id: string
          project_id: string
          from_user_id: string | null
          from_role: string
          sender_name: string | null
          text: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          from_user_id?: string | null
          from_role: string
          sender_name?: string | null
          text: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          from_user_id?: string | null
          from_role?: string
          sender_name?: string | null
          text?: string
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "client_messages_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      invoices: {
        Row: {
          id: string
          project_id: string
          label: string
          amount: number
          status: string
          due_date: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          label: string
          amount: number
          status?: string
          due_date?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          label?: string
          amount?: number
          status?: string
          due_date?: string | null
          created_at?: string
        }
        Relationships: [{ foreignKeyName: "invoices_project_id_fkey", columns: ["project_id"], referencedRelation: "projects", referencedColumns: ["id"] }]
      }
      team_chats: {
        Row: {
          id: string
          team_id: string
          type: string
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          type?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          type?: string
          name?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [{ foreignKeyName: "team_chats_team_id_fkey", columns: ["team_id"], referencedRelation: "teams", referencedColumns: ["id"] }]
      }
      team_chat_participants: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          role: string
          last_read_at: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role?: string
          last_read_at?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          role?: string
          last_read_at?: string | null
          joined_at?: string
        }
        Relationships: [
          { foreignKeyName: "team_chat_participants_chat_id_fkey", columns: ["chat_id"], referencedRelation: "team_chats", referencedColumns: ["id"] },
        ]
      }
      team_chat_messages: {
        Row: {
          id: string
          chat_id: string
          from_user_id: string
          text: string
          created_at: string
          message_type: string
          system_action: string | null
          system_target_id: string | null
        }
        Insert: {
          id?: string
          chat_id: string
          from_user_id?: string
          text?: string
          created_at?: string
          message_type?: string
          system_action?: string | null
          system_target_id?: string | null
        }
        Update: {
          id?: string
          chat_id?: string
          from_user_id?: string
          text?: string
          created_at?: string
          message_type?: string
          system_action?: string | null
          system_target_id?: string | null
        }
        Relationships: [
          { foreignKeyName: "team_chat_messages_chat_id_fkey", columns: ["chat_id"], referencedRelation: "team_chats", referencedColumns: ["id"] },
        ]
      }
      team_chat_message_attachments: {
        Row: {
          id: string
          message_id: string
          chat_id: string | null
          storage_path: string
          name: string
          size_bytes: number
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          chat_id?: string | null
          storage_path: string
          name: string
          size_bytes?: number
          type?: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          chat_id?: string | null
          storage_path?: string
          name?: string
          size_bytes?: number
          type?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: "team_chat_message_attachments_message_id_fkey", columns: ["message_id"], referencedRelation: "team_chat_messages", referencedColumns: ["id"] },
          { foreignKeyName: "team_chat_message_attachments_chat_id_fkey", columns: ["chat_id"], referencedRelation: "team_chats", referencedColumns: ["id"] }
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          income_source_id: string | null
          payment_method: string | null
          team_id: string
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          income_source_id?: string | null
          payment_method?: string | null
          team_id: string
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          income_source_id?: string | null
          payment_method?: string | null
          team_id?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_income_source_id_fkey"
            columns: ["income_source_id"]
            isOneToOne: false
            referencedRelation: "income_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_templates: {
        Row: {
          id: string
          team_id: string
          name: string
          category: string
          config: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          name: string
          category?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          name?: string
          category?: string
          config?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_templates_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
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
