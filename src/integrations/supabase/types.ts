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
      audit_logs: {
        Row: {
          action: string
          details_encrypted: string | null
          id: string
          ip_address: unknown | null
          session_id: string | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          details_encrypted?: string | null
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details_encrypted?: string | null
          id?: string
          ip_address?: unknown | null
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      check_in_responses: {
        Row: {
          id: string
          mood_rating: number | null
          needs_support: boolean | null
          notes: string | null
          task_id: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          id?: string
          mood_rating?: number | null
          needs_support?: boolean | null
          notes?: string | null
          task_id?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          id?: string
          mood_rating?: number | null
          needs_support?: boolean | null
          notes?: string | null
          task_id?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_in_responses_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "follow_up_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      craving_logs: {
        Row: {
          checkin_id: string | null
          coping_strategy: string | null
          created_at: string
          id: string
          intensity: number
          outcome_mood: number | null
          strategy_effectiveness: number | null
          triggers: Json | null
          urge_duration_minutes: number | null
          used_urge_surfing: boolean | null
          user_id: string
        }
        Insert: {
          checkin_id?: string | null
          coping_strategy?: string | null
          created_at?: string
          id?: string
          intensity: number
          outcome_mood?: number | null
          strategy_effectiveness?: number | null
          triggers?: Json | null
          urge_duration_minutes?: number | null
          used_urge_surfing?: boolean | null
          user_id: string
        }
        Update: {
          checkin_id?: string | null
          coping_strategy?: string | null
          created_at?: string
          id?: string
          intensity?: number
          outcome_mood?: number | null
          strategy_effectiveness?: number | null
          triggers?: Json | null
          urge_duration_minutes?: number | null
          used_urge_surfing?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "craving_logs_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "craving_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_emergency_contact: boolean | null
          last_contacted: string | null
          name: string
          notification_preferences: Json | null
          phone_number: string
          priority_order: number
          relationship: string
          response_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          last_contacted?: string | null
          name: string
          notification_preferences?: Json | null
          phone_number: string
          priority_order?: number
          relationship: string
          response_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_emergency_contact?: boolean | null
          last_contacted?: string | null
          name?: string
          notification_preferences?: Json | null
          phone_number?: string
          priority_order?: number
          relationship?: string
          response_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crisis_events: {
        Row: {
          assessment_responses: Json | null
          created_at: string
          crisis_resolved: boolean | null
          cssrs_score: number | null
          emergency_contacts_notified: boolean | null
          follow_up_scheduled: boolean | null
          id: string
          interventions_used: Json | null
          location_data: Json | null
          notes: string | null
          professional_contacted: boolean | null
          resolution_time: string | null
          risk_level: string | null
          user_id: string
        }
        Insert: {
          assessment_responses?: Json | null
          created_at?: string
          crisis_resolved?: boolean | null
          cssrs_score?: number | null
          emergency_contacts_notified?: boolean | null
          follow_up_scheduled?: boolean | null
          id?: string
          interventions_used?: Json | null
          location_data?: Json | null
          notes?: string | null
          professional_contacted?: boolean | null
          resolution_time?: string | null
          risk_level?: string | null
          user_id: string
        }
        Update: {
          assessment_responses?: Json | null
          created_at?: string
          crisis_resolved?: boolean | null
          cssrs_score?: number | null
          emergency_contacts_notified?: boolean | null
          follow_up_scheduled?: boolean | null
          id?: string
          interventions_used?: Json | null
          location_data?: Json | null
          notes?: string | null
          professional_contacted?: boolean | null
          resolution_time?: string | null
          risk_level?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crisis_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crisis_plans: {
        Row: {
          created_at: string
          created_by: string
          id: string
          last_reviewed: string
          next_review_date: string
          plan_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          last_reviewed?: string
          next_review_date?: string
          plan_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          last_reviewed?: string
          next_review_date?: string
          plan_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crisis_resolutions: {
        Row: {
          additional_notes: string | null
          created_at: string
          crisis_start_time: string
          effectiveness_rating: number | null
          id: string
          interventions_used: Json | null
          resolution_time: string
          safety_confirmed: boolean | null
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          created_at?: string
          crisis_start_time: string
          effectiveness_rating?: number | null
          id?: string
          interventions_used?: Json | null
          resolution_time: string
          safety_confirmed?: boolean | null
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          created_at?: string
          crisis_start_time?: string
          effectiveness_rating?: number | null
          id?: string
          interventions_used?: Json | null
          resolution_time?: string
          safety_confirmed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      daily_checkins: {
        Row: {
          checkin_date: string
          completed_sections: Json | null
          created_at: string
          energy_rating: number | null
          gad2_q1_response: number | null
          gad2_q2_response: number | null
          gad2_score: number | null
          hope_rating: number | null
          id: string
          is_complete: boolean | null
          mood_rating: number | null
          notes: string | null
          phq2_q1_response: number | null
          phq2_q2_response: number | null
          phq2_score: number | null
          recovery_importance: number | null
          recovery_strength: string | null
          sobriety_confidence: number | null
          support_needed: string | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          completed_sections?: Json | null
          created_at?: string
          energy_rating?: number | null
          gad2_q1_response?: number | null
          gad2_q2_response?: number | null
          gad2_score?: number | null
          hope_rating?: number | null
          id?: string
          is_complete?: boolean | null
          mood_rating?: number | null
          notes?: string | null
          phq2_q1_response?: number | null
          phq2_q2_response?: number | null
          phq2_score?: number | null
          recovery_importance?: number | null
          recovery_strength?: string | null
          sobriety_confidence?: number | null
          support_needed?: string | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          completed_sections?: Json | null
          created_at?: string
          energy_rating?: number | null
          gad2_q1_response?: number | null
          gad2_q2_response?: number | null
          gad2_score?: number | null
          hope_rating?: number | null
          id?: string
          is_complete?: boolean | null
          mood_rating?: number | null
          notes?: string | null
          phq2_q1_response?: number | null
          phq2_q2_response?: number | null
          phq2_score?: number | null
          recovery_importance?: number | null
          recovery_strength?: string | null
          sobriety_confidence?: number | null
          support_needed?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_checkins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notify_for_crisis: boolean | null
          notify_for_milestones: boolean | null
          phone_number: string | null
          preferred_contact_method: string | null
          priority_order: number | null
          relationship: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notify_for_crisis?: boolean | null
          notify_for_milestones?: boolean | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          priority_order?: number | null
          relationship: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notify_for_crisis?: boolean | null
          notify_for_milestones?: boolean | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          priority_order?: number | null
          relationship?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_tasks: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          crisis_event_id: string | null
          id: string
          scheduled_for: string
          task_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          crisis_event_id?: string | null
          id?: string
          scheduled_for: string
          task_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          crisis_event_id?: string | null
          id?: string
          scheduled_for?: string
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      goal_progress: {
        Row: {
          confidence_rating: number | null
          created_at: string
          date: string
          goal_id: string
          id: string
          mood_rating: number | null
          notes: string | null
          user_id: string
          value: number
        }
        Insert: {
          confidence_rating?: number | null
          created_at?: string
          date: string
          goal_id: string
          id?: string
          mood_rating?: number | null
          notes?: string | null
          user_id: string
          value: number
        }
        Update: {
          confidence_rating?: number | null
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          mood_rating?: number | null
          notes?: string | null
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "goal_progress_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "recovery_goals"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_templates: {
        Row: {
          category: string
          created_at: string
          default_duration_days: number | null
          description: string
          id: string
          suggested_milestones: Json | null
          tags: Json | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          default_duration_days?: number | null
          description: string
          id?: string
          suggested_milestones?: Json | null
          tags?: Json | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          default_duration_days?: number | null
          description?: string
          id?: string
          suggested_milestones?: Json | null
          tags?: Json | null
          title?: string
        }
        Relationships: []
      }
      gratitude_entries: {
        Row: {
          checkin_id: string | null
          created_at: string | null
          gratitude_text: string
          id: string
        }
        Insert: {
          checkin_id?: string | null
          created_at?: string | null
          gratitude_text: string
          id?: string
        }
        Update: {
          checkin_id?: string | null
          created_at?: string | null
          gratitude_text?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gratitude_entries_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_triggers: {
        Row: {
          checkin_id: string | null
          created_at: string | null
          id: string
          trigger_name: string
        }
        Insert: {
          checkin_id?: string | null
          created_at?: string | null
          id?: string
          trigger_name: string
        }
        Update: {
          checkin_id?: string | null
          created_at?: string | null
          id?: string
          trigger_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_triggers_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          assessment_reminder_time: string | null
          created_at: string
          data_sharing_consent: boolean | null
          email: string | null
          emergency_contact_consent: boolean | null
          enable_crisis_alerts: boolean | null
          enable_family_notifications: boolean | null
          full_name: string | null
          hipaa_consent_given: boolean | null
          id: string
          recovery_start_date: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          assessment_reminder_time?: string | null
          created_at?: string
          data_sharing_consent?: boolean | null
          email?: string | null
          emergency_contact_consent?: boolean | null
          enable_crisis_alerts?: boolean | null
          enable_family_notifications?: boolean | null
          full_name?: string | null
          hipaa_consent_given?: boolean | null
          id: string
          recovery_start_date?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          assessment_reminder_time?: string | null
          created_at?: string
          data_sharing_consent?: boolean | null
          email?: string | null
          emergency_contact_consent?: boolean | null
          enable_crisis_alerts?: boolean | null
          enable_family_notifications?: boolean | null
          full_name?: string | null
          hipaa_consent_given?: boolean | null
          id?: string
          recovery_start_date?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recovery_goals: {
        Row: {
          accountability_partner_id: string | null
          category: string
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string
          id: string
          milestones: Json | null
          next_reminder: string | null
          pause_reason: string | null
          priority: string
          progress: number | null
          reminder_frequency: string | null
          status: string
          tags: Json | null
          target_date: string
          target_value: number | null
          title: string
          unit: string | null
          user_id: string
        }
        Insert: {
          accountability_partner_id?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description: string
          id?: string
          milestones?: Json | null
          next_reminder?: string | null
          pause_reason?: string | null
          priority: string
          progress?: number | null
          reminder_frequency?: string | null
          status?: string
          tags?: Json | null
          target_date: string
          target_value?: number | null
          title: string
          unit?: string | null
          user_id: string
        }
        Update: {
          accountability_partner_id?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string
          id?: string
          milestones?: Json | null
          next_reminder?: string | null
          pause_reason?: string | null
          priority?: string
          progress?: number | null
          reminder_frequency?: string | null
          status?: string
          tags?: Json | null
          target_date?: string
          target_value?: number | null
          title?: string
          unit?: string | null
          user_id?: string
        }
        Relationships: []
      }
      skill_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          effectiveness_rating: number | null
          id: string
          module_type: string
          notes: string | null
          real_world_applied: boolean | null
          session_duration_minutes: number | null
          skill_category: string
          skill_name: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          effectiveness_rating?: number | null
          id?: string
          module_type: string
          notes?: string | null
          real_world_applied?: boolean | null
          session_duration_minutes?: number | null
          skill_category: string
          skill_name: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          effectiveness_rating?: number | null
          id?: string
          module_type?: string
          notes?: string | null
          real_world_applied?: boolean | null
          session_duration_minutes?: number | null
          skill_category?: string
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      skills_progress: {
        Row: {
          completion_percentage: number | null
          created_at: string
          id: string
          last_practiced_at: string | null
          mastery_level: string | null
          notes: string | null
          self_reported_effectiveness: number | null
          skill_category: string
          skill_name: string
          times_practiced: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: string | null
          notes?: string | null
          self_reported_effectiveness?: number | null
          skill_category: string
          skill_name: string
          times_practiced?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          mastery_level?: string | null
          notes?: string | null
          self_reported_effectiveness?: number | null
          skill_category?: string
          skill_name?: string
          times_practiced?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      support_contacts: {
        Row: {
          contact_method: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          relationship: string
          share_location: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_method?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship: string
          share_location?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_method?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string
          share_location?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thought_record_templates: {
        Row: {
          automatic_thought_example: string
          balanced_thought_example: string
          category: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          scenario: string
          user_id: string | null
        }
        Insert: {
          automatic_thought_example: string
          balanced_thought_example: string
          category: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          scenario: string
          user_id?: string | null
        }
        Update: {
          automatic_thought_example?: string
          balanced_thought_example?: string
          category?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          scenario?: string
          user_id?: string | null
        }
        Relationships: []
      }
      thought_records: {
        Row: {
          automatic_thoughts: string
          balanced_reframe: string | null
          checkin_id: string | null
          contains_crisis_language: boolean | null
          created_at: string
          emotions: Json | null
          evidence_against: string | null
          evidence_for: string | null
          id: string
          physical_sensations: Json | null
          reviewed_by_professional: boolean | null
          situation: string
          user_id: string
        }
        Insert: {
          automatic_thoughts: string
          balanced_reframe?: string | null
          checkin_id?: string | null
          contains_crisis_language?: boolean | null
          created_at?: string
          emotions?: Json | null
          evidence_against?: string | null
          evidence_for?: string | null
          id?: string
          physical_sensations?: Json | null
          reviewed_by_professional?: boolean | null
          situation: string
          user_id: string
        }
        Update: {
          automatic_thoughts?: string
          balanced_reframe?: string | null
          checkin_id?: string | null
          contains_crisis_language?: boolean | null
          created_at?: string
          emotions?: Json | null
          evidence_against?: string | null
          evidence_for?: string | null
          id?: string
          physical_sensations?: Json | null
          reviewed_by_professional?: boolean | null
          situation?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thought_records_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thought_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          badge_name: string
          badge_type: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_name: string
          badge_type: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_name?: string
          badge_type?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_insights: {
        Row: {
          created_at: string
          id: string
          insight_data: Json
          insight_type: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_data: Json
          insight_type: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_data?: Json
          insight_type?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_skill_preferences: {
        Row: {
          completed_assessment: boolean | null
          id: string
          last_updated: string | null
          learning_style: string | null
          preferred_modules: Json | null
          user_id: string
        }
        Insert: {
          completed_assessment?: boolean | null
          id?: string
          last_updated?: string | null
          learning_style?: string | null
          preferred_modules?: Json | null
          user_id: string
        }
        Update: {
          completed_assessment?: boolean | null
          id?: string
          last_updated?: string | null
          learning_style?: string | null
          preferred_modules?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_craving_patterns: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: Json
      }
      calculate_skill_mastery: {
        Args: { user_uuid: string; skill_category_param: string }
        Returns: string
      }
      check_badge_eligibility: {
        Args: { user_uuid: string; badge_name_param: string }
        Returns: boolean
      }
      generate_daily_insights: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: undefined
      }
      get_daily_trends: {
        Args: { user_uuid: string; days_back: number }
        Returns: {
          checkin_date: string
          mood_rating: number
          energy_rating: number
          hope_rating: number
          trend_direction: string
        }[]
      }
      get_mood_trends: {
        Args: { user_uuid: string; days_back?: number }
        Returns: {
          checkin_date: string
          mood_rating: number
          energy_rating: number
          hope_rating: number
          trend_direction: string
        }[]
      }
      get_recovery_streak: {
        Args: { user_uuid: string }
        Returns: Json
      }
      log_security_violation: {
        Args: { violation_type: string; details?: Json }
        Returns: undefined
      }
      notify_partner: {
        Args: { partner_id: string; notification_type: string; data: Json }
        Returns: undefined
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
