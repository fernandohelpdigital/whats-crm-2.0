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
      deals: {
        Row: {
          address: string | null
          avatar_url: string | null
          average_bill_value: number | null
          budget_presented: boolean | null
          city: string | null
          company: string
          complement: string | null
          contact_id: string | null
          created_at: string
          date: string | null
          email: string | null
          id: string
          neighborhood: string | null
          notes: string | null
          number_address: string | null
          phone: string | null
          source: string | null
          state: string | null
          status: Database["public"]["Enums"]["deal_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          value: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          average_bill_value?: number | null
          budget_presented?: boolean | null
          city?: string | null
          company?: string
          complement?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string | null
          email?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          number_address?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          value?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          average_bill_value?: number | null
          budget_presented?: boolean | null
          city?: string | null
          company?: string
          complement?: string | null
          contact_id?: string | null
          created_at?: string
          date?: string | null
          email?: string | null
          id?: string
          neighborhood?: string | null
          notes?: string | null
          number_address?: string | null
          phone?: string | null
          source?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["deal_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          value?: number | null
          zip_code?: string | null
        }
        Relationships: []
      }
      follow_up_tasks: {
        Row: {
          avatar_url: string | null
          contact_id: string | null
          contact_name: string
          created_at: string
          id: string
          message: string
          scheduled_at: string
          status: Database["public"]["Enums"]["task_status"]
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          contact_id?: string | null
          contact_name: string
          created_at?: string
          id?: string
          message?: string
          scheduled_at: string
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          contact_id?: string | null
          contact_name?: string
          created_at?: string
          id?: string
          message?: string
          scheduled_at?: string
          status?: Database["public"]["Enums"]["task_status"]
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instance_feature_flags: {
        Row: {
          chat: boolean | null
          dashboard: boolean | null
          followup: boolean | null
          id: string
          instance_name: string
          kanban: boolean | null
          proposals: boolean | null
        }
        Insert: {
          chat?: boolean | null
          dashboard?: boolean | null
          followup?: boolean | null
          id?: string
          instance_name: string
          kanban?: boolean | null
          proposals?: boolean | null
        }
        Update: {
          chat?: boolean | null
          dashboard?: boolean | null
          followup?: boolean | null
          id?: string
          instance_name?: string
          kanban?: boolean | null
          proposals?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          api_key: string | null
          avatar_url: string | null
          base_url: string | null
          created_at: string
          display_name: string | null
          id: string
          instance_name: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          avatar_url?: string | null
          base_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          instance_name?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          avatar_url?: string | null
          base_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          address_data: Json | null
          contact_name: string | null
          contact_number: string | null
          created_at: string
          description: string | null
          hours_estimated: number | null
          id: string
          monthly_cost: number | null
          project_title: string | null
          service_type: string | null
          setup_cost: number | null
          tech_stack: string | null
          timeline: string | null
          user_id: string
        }
        Insert: {
          address_data?: Json | null
          contact_name?: string | null
          contact_number?: string | null
          created_at?: string
          description?: string | null
          hours_estimated?: number | null
          id?: string
          monthly_cost?: number | null
          project_title?: string | null
          service_type?: string | null
          setup_cost?: number | null
          tech_stack?: string | null
          timeline?: string | null
          user_id: string
        }
        Update: {
          address_data?: Json | null
          contact_name?: string | null
          contact_number?: string | null
          created_at?: string
          description?: string | null
          hours_estimated?: number | null
          id?: string
          monthly_cost?: number | null
          project_title?: string | null
          service_type?: string | null
          setup_cost?: number | null
          tech_stack?: string | null
          timeline?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_branding: {
        Row: {
          id: string
          primary_color: string
          system_name: string
        }
        Insert: {
          id?: string
          primary_color?: string
          system_name?: string
        }
        Update: {
          id?: string
          primary_color?: string
          system_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      deal_status:
        | "lead_capturado"
        | "contato_inicial"
        | "diagnostico_levantamento"
        | "proposta_construcao"
        | "proposta_enviada"
        | "negociacao"
        | "fechado_aprovado"
        | "em_execucao"
        | "entrega_homologacao"
        | "pos_venda"
        | "em_followup"
        | "perdido"
      task_status: "pending" | "sent" | "cancelled"
      task_type: "whatsapp" | "call" | "email"
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
      app_role: ["admin", "user"],
      deal_status: [
        "lead_capturado",
        "contato_inicial",
        "diagnostico_levantamento",
        "proposta_construcao",
        "proposta_enviada",
        "negociacao",
        "fechado_aprovado",
        "em_execucao",
        "entrega_homologacao",
        "pos_venda",
        "em_followup",
        "perdido",
      ],
      task_status: ["pending", "sent", "cancelled"],
      task_type: ["whatsapp", "call", "email"],
    },
  },
} as const
