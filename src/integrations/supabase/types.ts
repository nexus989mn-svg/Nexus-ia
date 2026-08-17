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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_conversation_runtime: {
        Row: { id: string; company_id: string; channel: string; remote_conversation_id: string; module_code: string; status: string; debounce_until: string | null; last_message_at: string | null; processing_job_id: string | null; locked_at: string | null; locked_by: string | null; version: number; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; company_id: string; channel?: string; remote_conversation_id: string; module_code?: string; status?: string; debounce_until?: string | null; last_message_at?: string | null; processing_job_id?: string | null; locked_at?: string | null; locked_by?: string | null; version?: number; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; company_id?: string; channel?: string; remote_conversation_id?: string; module_code?: string; status?: string; debounce_until?: string | null; last_message_at?: string | null; processing_job_id?: string | null; locked_at?: string | null; locked_by?: string | null; version?: number; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      agent_execution_jobs: {
        Row: { id: string; company_id: string; agent_instance_id: string | null; runtime_id: string | null; job_type: string; idempotency_key: string; priority: number; status: string; available_at: string; locked_at: string | null; locked_by: string | null; attempts: number; max_attempts: number; payload: Json; result: Json; error_message: string | null; created_at: string; started_at: string | null; completed_at: string | null; updated_at: string }
        Insert: { id?: string; company_id: string; agent_instance_id?: string | null; runtime_id?: string | null; job_type: string; idempotency_key: string; priority?: number; status?: string; available_at?: string; locked_at?: string | null; locked_by?: string | null; attempts?: number; max_attempts?: number; payload?: Json; result?: Json; error_message?: string | null; created_at?: string; started_at?: string | null; completed_at?: string | null; updated_at?: string }
        Update: { id?: string; company_id?: string; agent_instance_id?: string | null; runtime_id?: string | null; job_type?: string; idempotency_key?: string; priority?: number; status?: string; available_at?: string; locked_at?: string | null; locked_by?: string | null; attempts?: number; max_attempts?: number; payload?: Json; result?: Json; error_message?: string | null; created_at?: string; started_at?: string | null; completed_at?: string | null; updated_at?: string }
        Relationships: []
      }
      agent_inbox_messages: {
        Row: { id: string; company_id: string; runtime_id: string; message_id: string; remote_message_id: string | null; sender_id: string | null; role: string; content: string | null; payload: Json; status: string; created_at: string; processed_at: string | null }
        Insert: { id?: string; company_id: string; runtime_id: string; message_id: string; remote_message_id?: string | null; sender_id?: string | null; role?: string; content?: string | null; payload?: Json; status?: string; created_at?: string; processed_at?: string | null }
        Update: { id?: string; company_id?: string; runtime_id?: string; message_id?: string; remote_message_id?: string | null; sender_id?: string | null; role?: string; content?: string | null; payload?: Json; status?: string; created_at?: string; processed_at?: string | null }
        Relationships: []
      }
      company_agent_configs: {
        Row: { id: string; company_id: string; module_code: string; display_name: string | null; behavior_prompt: string; company_context: Json; rules: Json; version: number; updated_by: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; company_id: string; module_code: string; display_name?: string | null; behavior_prompt?: string; company_context?: Json; rules?: Json; version?: number; updated_by?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; company_id?: string; module_code?: string; display_name?: string | null; behavior_prompt?: string; company_context?: Json; rules?: Json; version?: number; updated_by?: string | null; created_at?: string; updated_at?: string }
        Relationships: []
      }
      company_agent_instances: {
        Row: { id: string; company_id: string; module_code: string; internal_name: string; enabled: boolean; config_version: number; metadata: Json; created_at: string; updated_at: string }
        Insert: { id?: string; company_id: string; module_code: string; internal_name: string; enabled?: boolean; config_version?: number; metadata?: Json; created_at?: string; updated_at?: string }
        Update: { id?: string; company_id?: string; module_code?: string; internal_name?: string; enabled?: boolean; config_version?: number; metadata?: Json; created_at?: string; updated_at?: string }
        Relationships: []
      }
      catalog_design_jobs: {
        Row: { id: string; company_id: string; catalog_id: string | null; conversation_id: string | null; requested_by: string | null; status: string; brief: Json; reference_urls: Json; canva_design_id: string | null; canva_preview_url: string | null; result: Json; error_message: string | null; created_at: string; started_at: string | null; completed_at: string | null; updated_at: string }
        Insert: { id?: string; company_id: string; catalog_id?: string | null; conversation_id?: string | null; requested_by?: string | null; status?: string; brief?: Json; reference_urls?: Json; canva_design_id?: string | null; canva_preview_url?: string | null; result?: Json; error_message?: string | null; created_at?: string; started_at?: string | null; completed_at?: string | null; updated_at?: string }
        Update: { id?: string; company_id?: string; catalog_id?: string | null; conversation_id?: string | null; requested_by?: string | null; status?: string; brief?: Json; reference_urls?: Json; canva_design_id?: string | null; canva_preview_url?: string | null; result?: Json; error_message?: string | null; created_at?: string; started_at?: string | null; completed_at?: string | null; updated_at?: string }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          module_code: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          module_code?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          module_code?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          company_id: string
          content: string | null
          conversation_id: string
          created_at: string
          id: string
          model: string | null
          parts: Json
          role: string
          tokens_input: number | null
          tokens_output: number | null
        }
        Insert: {
          company_id: string
          content?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json
          role: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Update: {
          company_id?: string
          content?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          model?: string | null
          parts?: Json
          role?: string
          tokens_input?: number | null
          tokens_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_modules: {
        Row: {
          code: string
          created_at: string
          description: string | null
          execution_count: number
          id: string
          is_enabled: boolean
          last_run_at: string | null
          max_tokens: number
          metadata: Json
          model: string
          name: string
          system_prompt: string
          temperature: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          max_tokens?: number
          metadata?: Json
          model?: string
          name: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          execution_count?: number
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          max_tokens?: number
          metadata?: Json
          model?: string
          name?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          event_type: string
          external_event_id: string
          id: string
          payload: Json | null
          processed_at: string
          provider: string
          user_id: string | null
        }
        Insert: {
          event_type: string
          external_event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string
          provider?: string
          user_id?: string | null
        }
        Update: {
          event_type?: string
          external_event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string
          provider?: string
          user_id?: string | null
        }
        Relationships: []
      }
      briefings: {
        Row: {
          channel: string
          company_id: string
          contact: string | null
          created_at: string
          customer_name: string
          id: string
          metadata: Json
          status: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          company_id: string
          contact?: string | null
          created_at?: string
          customer_name: string
          id?: string
          metadata?: Json
          status?: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          company_id?: string
          contact?: string | null
          created_at?: string
          customer_name?: string
          id?: string
          metadata?: Json
          status?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "briefings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_products: {
        Row: {
          category_id: string | null
          company_id: string
          created_at: string
          currency: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          metadata: Json
          name: string
          price_cents: number
          sku: string | null
          stock: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name: string
          price_cents?: number
          sku?: string | null
          stock?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          metadata?: Json
          name?: string
          price_cents?: number
          sku?: string | null
          stock?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "catalog_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          id: string
          locale: string
          logo_url: string | null
          metadata: Json
          name: string
          owner_user_id: string
          phone: string | null
          slug: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          metadata?: Json
          name: string
          owner_user_id: string
          phone?: string | null
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          metadata?: Json
          name?: string
          owner_user_id?: string
          phone?: string | null
          slug?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_credentials: {
        Row: {
          api_key: string | null
          base_url: string | null
          config: Json
          created_at: string
          id: string
          is_enabled: boolean
          label: string
          last_test_at: string | null
          last_test_message: string | null
          last_test_status: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          label: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          config?: Json
          created_at?: string
          id?: string
          is_enabled?: boolean
          label?: string
          last_test_at?: string | null
          last_test_message?: string | null
          last_test_status?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      trial_claims: {
        Row: {
          id: string
          user_id: string
          email_normalized: string
          phone_e164: string | null
          source: string
          metadata: Json
          used_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_normalized: string
          phone_e164?: string | null
          source?: string
          metadata?: Json
          used_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_normalized?: string
          phone_e164?: string | null
          source?: string
          metadata?: Json
          used_at?: string
          created_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          features: Json
          id: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_active: boolean
          name: string
          price_usd_cents: number
          sort_order: number
          stripe_price_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          name: string
          price_usd_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: Database["public"]["Enums"]["plan_interval"]
          is_active?: boolean
          name?: string
          price_usd_cents?: number
          sort_order?: number
          stripe_price_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          blocked_reason: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          event: string
          id: string
          metadata: Json | null
          severity: string
          source: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          metadata?: Json | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          metadata?: Json | null
          severity?: string
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_connections: {
        Row: {
          company_id: string
          connected_at: string | null
          created_at: string
          display_name: string | null
          id: string
          instance_name: string
          last_seen_at: string | null
          metadata: Json
          phone_e164: string | null
          qr_code: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string
          last_seen_at?: string | null
          metadata?: Json
          phone_e164?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          connected_at?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          instance_name?: string
          last_seen_at?: string | null
          metadata?: Json
          phone_e164?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_connections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      expire_overdue_subscriptions: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_owns_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "customer"
      plan_interval: "trial" | "monthly" | "yearly"
      subscription_status:
        | "trial"
        | "active"
        | "expired"
        | "blocked"
        | "canceled"
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
      app_role: ["admin", "customer"],
      plan_interval: ["trial", "monthly", "yearly"],
      subscription_status: [
        "trial",
        "active",
        "expired",
        "blocked",
        "canceled",
      ],
    },
  },
} as const
