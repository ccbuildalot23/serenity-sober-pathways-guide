export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accountability_partnerships: {
        Row: {
          accepted_at: string | null
          check_in_schedule: Json
          created_at: string
          encrypted_agreement_hash: string | null
          id: string
          partner_id: string
          partnership_agreement: Json
          privacy_settings: Json
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          check_in_schedule?: Json
          created_at?: string
          encrypted_agreement_hash?: string | null
          id?: string
          partner_id: string
          partnership_agreement?: Json
          privacy_settings?: Json
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          check_in_schedule?: Json
          created_at?: string
          encrypted_agreement_hash?: string | null
          id?: string
          partner_id?: string
          partnership_agreement?: Json
          privacy_settings?: Json
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_change_requests: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          new_end_time: string | null
          new_start_time: string | null
          provider_response: string | null
          reason: string | null
          request_type: string
          requested_by: string
          responded_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          new_end_time?: string | null
          new_start_time?: string | null
          provider_response?: string | null
          reason?: string | null
          request_type: string
          requested_by: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          new_end_time?: string | null
          new_start_time?: string | null
          provider_response?: string | null
          reason?: string | null
          request_type?: string
          requested_by?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          error_message: string | null
          id: string
          message_content: string | null
          reminder_method: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          reminder_method: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          message_content?: string | null
          reminder_method?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      appointment_waitlist: {
        Row: {
          appointment_type: string
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          notified_at: string | null
          patient_id: string
          preferred_date: string | null
          preferred_time_end: string | null
          preferred_time_start: string | null
          priority_level: number | null
          provider_id: string
          status: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          patient_id: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority_level?: number | null
          provider_id: string
          status?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          notified_at?: string | null
          patient_id?: string
          preferred_date?: string | null
          preferred_time_end?: string | null
          preferred_time_start?: string | null
          priority_level?: number | null
          provider_id?: string
          status?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type: string
          base_fee: number | null
          booking_notes: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          end_time: string
          id: string
          is_recurring: boolean | null
          late_cancellation_fee: number | null
          location_details: Json | null
          location_type: string
          no_show_fee: number | null
          parent_appointment_id: string | null
          patient_id: string
          pre_appointment_forms: Json | null
          provider_id: string
          provider_notes: string | null
          recurrence_pattern: Json | null
          session_notes: string | null
          start_time: string
          status: string
          title: string | null
          updated_at: string
          video_link: string | null
          waiting_room_enabled: boolean | null
        }
        Insert: {
          appointment_type?: string
          base_fee?: number | null
          booking_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_time: string
          id?: string
          is_recurring?: boolean | null
          late_cancellation_fee?: number | null
          location_details?: Json | null
          location_type?: string
          no_show_fee?: number | null
          parent_appointment_id?: string | null
          patient_id: string
          pre_appointment_forms?: Json | null
          provider_id: string
          provider_notes?: string | null
          recurrence_pattern?: Json | null
          session_notes?: string | null
          start_time: string
          status?: string
          title?: string | null
          updated_at?: string
          video_link?: string | null
          waiting_room_enabled?: boolean | null
        }
        Update: {
          appointment_type?: string
          base_fee?: number | null
          booking_notes?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          late_cancellation_fee?: number | null
          location_details?: Json | null
          location_type?: string
          no_show_fee?: number | null
          parent_appointment_id?: string | null
          patient_id?: string
          pre_appointment_forms?: Json | null
          provider_id?: string
          provider_notes?: string | null
          recurrence_pattern?: Json | null
          session_notes?: string | null
          start_time?: string
          status?: string
          title?: string | null
          updated_at?: string
          video_link?: string | null
          waiting_room_enabled?: boolean | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      backup_verification_logs: {
        Row: {
          backup_date: string
          backup_size_bytes: number | null
          backup_type: string
          created_at: string
          error_details: Json | null
          geographic_redundancy_verified: boolean | null
          id: string
          integrity_check_passed: boolean | null
          next_verification_date: string | null
          recovery_test_passed: boolean | null
          verification_completed_at: string | null
          verification_metrics: Json | null
          verification_started_at: string
          verification_status: string
        }
        Insert: {
          backup_date: string
          backup_size_bytes?: number | null
          backup_type: string
          created_at?: string
          error_details?: Json | null
          geographic_redundancy_verified?: boolean | null
          id?: string
          integrity_check_passed?: boolean | null
          next_verification_date?: string | null
          recovery_test_passed?: boolean | null
          verification_completed_at?: string | null
          verification_metrics?: Json | null
          verification_started_at?: string
          verification_status?: string
        }
        Update: {
          backup_date?: string
          backup_size_bytes?: number | null
          backup_type?: string
          created_at?: string
          error_details?: Json | null
          geographic_redundancy_verified?: boolean | null
          id?: string
          integrity_check_passed?: boolean | null
          next_verification_date?: string | null
          recovery_test_passed?: boolean | null
          verification_completed_at?: string | null
          verification_metrics?: Json | null
          verification_started_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      calendar_integrations: {
        Row: {
          access_token_encrypted: string | null
          calendar_id: string | null
          created_at: string
          id: string
          integration_type: string
          last_sync_at: string | null
          refresh_token_encrypted: string | null
          sync_enabled: boolean | null
          sync_settings: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          integration_type: string
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_enabled?: boolean | null
          sync_settings?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          calendar_id?: string | null
          created_at?: string
          id?: string
          integration_type?: string
          last_sync_at?: string | null
          refresh_token_encrypted?: string | null
          sync_enabled?: boolean | null
          sync_settings?: Json | null
          updated_at?: string
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
      checkin_assessments: {
        Row: {
          assessment_type: string
          checkin_id: string
          created_at: string
          id: string
          responses: Json
          scores: Json
        }
        Insert: {
          assessment_type: string
          checkin_id: string
          created_at?: string
          id?: string
          responses?: Json
          scores?: Json
        }
        Update: {
          assessment_type?: string
          checkin_id?: string
          created_at?: string
          id?: string
          responses?: Json
          scores?: Json
        }
        Relationships: [
          {
            foreignKeyName: "checkin_assessments_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "daily_checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_stats: {
        Row: {
          average_mood: number | null
          last_checkin: string | null
          streak_count: number
          total_checkins: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_mood?: number | null
          last_checkin?: string | null
          streak_count?: number
          total_checkins?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_mood?: number | null
          last_checkin?: string | null
          streak_count?: number
          total_checkins?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_assessments: {
        Row: {
          assessment_data: Json
          assessment_type: string
          completed_date: string | null
          created_at: string
          id: string
          interpretation: string | null
          provider_id: string | null
          recommendations: string | null
          scheduled_date: string | null
          scores: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_data?: Json
          assessment_type: string
          completed_date?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          provider_id?: string | null
          recommendations?: string | null
          scheduled_date?: string | null
          scores?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_data?: Json
          assessment_type?: string
          completed_date?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          provider_id?: string | null
          recommendations?: string | null
          scheduled_date?: string | null
          scores?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_confidential: boolean
          note_type: string
          plan_id: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_confidential?: boolean
          note_type: string
          plan_id: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_confidential?: boolean
          note_type?: string
          plan_id?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      community_forums: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
        }
        Relationships: []
      }
      compliance_audit_trails: {
        Row: {
          action_description: string
          action_type: string
          compliance_score_after: number | null
          compliance_score_before: number | null
          evidence_data: Json | null
          id: string
          metadata: Json | null
          performed_by: string
          requirement_id: string
          timestamp: string
        }
        Insert: {
          action_description: string
          action_type: string
          compliance_score_after?: number | null
          compliance_score_before?: number | null
          evidence_data?: Json | null
          id?: string
          metadata?: Json | null
          performed_by: string
          requirement_id: string
          timestamp?: string
        }
        Update: {
          action_description?: string
          action_type?: string
          compliance_score_after?: number | null
          compliance_score_before?: number | null
          evidence_data?: Json | null
          id?: string
          metadata?: Json | null
          performed_by?: string
          requirement_id?: string
          timestamp?: string
        }
        Relationships: []
      }
      compliance_reports: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          critical_gaps: number | null
          framework_scores: Json
          generated_at: string
          generated_by: string
          high_priority_gaps: number | null
          id: string
          overall_compliance_score: number
          report_data: Json
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          status: string
          upcoming_deadlines: number | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          critical_gaps?: number | null
          framework_scores?: Json
          generated_at?: string
          generated_by: string
          high_priority_gaps?: number | null
          id?: string
          overall_compliance_score: number
          report_data?: Json
          report_type: string
          reporting_period_end: string
          reporting_period_start: string
          status?: string
          upcoming_deadlines?: number | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          critical_gaps?: number | null
          framework_scores?: Json
          generated_at?: string
          generated_by?: string
          high_priority_gaps?: number | null
          id?: string
          overall_compliance_score?: number
          report_data?: Json
          report_type?: string
          reporting_period_end?: string
          reporting_period_start?: string
          status?: string
          upcoming_deadlines?: number | null
        }
        Relationships: []
      }
      compliance_requirements: {
        Row: {
          assigned_to: string | null
          category: string
          compliance_status: string
          created_at: string
          description: string
          due_date: string | null
          evidence_required: string | null
          id: string
          implementation_notes: string | null
          last_reviewed_at: string | null
          next_review_date: string | null
          priority_level: string
          regulation_framework: string
          requirement_name: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          compliance_status?: string
          created_at?: string
          description: string
          due_date?: string | null
          evidence_required?: string | null
          id?: string
          implementation_notes?: string | null
          last_reviewed_at?: string | null
          next_review_date?: string | null
          priority_level?: string
          regulation_framework: string
          requirement_name: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          compliance_status?: string
          created_at?: string
          description?: string
          due_date?: string | null
          evidence_required?: string | null
          id?: string
          implementation_notes?: string | null
          last_reviewed_at?: string | null
          next_review_date?: string | null
          priority_level?: string
          regulation_framework?: string
          requirement_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_reactions: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string
          details: string | null
          id: string
          reason: string
          reported_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reported_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reported_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
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
      crisis_alerts: {
        Row: {
          alert_time: string
          contacts_notified: number | null
          id: string
          location_shared: boolean | null
          message_sent: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          alert_time?: string
          contacts_notified?: number | null
          id?: string
          location_shared?: boolean | null
          message_sent?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          alert_time?: string
          contacts_notified?: number | null
          id?: string
          location_shared?: boolean | null
          message_sent?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
      crisis_prediction_patterns: {
        Row: {
          confidence_score: number | null
          id: string
          is_active: boolean | null
          last_updated: string
          pattern_data: Json
          pattern_type: string
          risk_indicators: Json | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          pattern_data?: Json
          pattern_type: string
          risk_indicators?: Json | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          id?: string
          is_active?: boolean | null
          last_updated?: string
          pattern_data?: Json
          pattern_type?: string
          risk_indicators?: Json | null
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
          provider_id: string | null
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
          provider_id?: string | null
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
          provider_id?: string | null
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
          coping_strategies: Json | null
          created_at: string
          energy_rating: number | null
          gad2_q1_response: number | null
          gad2_q2_response: number | null
          gad2_score: number | null
          hope_rating: number | null
          id: string
          is_complete: boolean | null
          medication_taken: boolean | null
          mood_rating: number | null
          notes: string | null
          phq2_q1_response: number | null
          phq2_q2_response: number | null
          phq2_score: number | null
          recovery_importance: number | null
          recovery_strength: string | null
          sleep_quality: number | null
          sobriety_confidence: number | null
          support_needed: string | null
          triggers: Json | null
          user_id: string
        }
        Insert: {
          checkin_date: string
          completed_sections?: Json | null
          coping_strategies?: Json | null
          created_at?: string
          energy_rating?: number | null
          gad2_q1_response?: number | null
          gad2_q2_response?: number | null
          gad2_score?: number | null
          hope_rating?: number | null
          id?: string
          is_complete?: boolean | null
          medication_taken?: boolean | null
          mood_rating?: number | null
          notes?: string | null
          phq2_q1_response?: number | null
          phq2_q2_response?: number | null
          phq2_score?: number | null
          recovery_importance?: number | null
          recovery_strength?: string | null
          sleep_quality?: number | null
          sobriety_confidence?: number | null
          support_needed?: string | null
          triggers?: Json | null
          user_id: string
        }
        Update: {
          checkin_date?: string
          completed_sections?: Json | null
          coping_strategies?: Json | null
          created_at?: string
          energy_rating?: number | null
          gad2_q1_response?: number | null
          gad2_q2_response?: number | null
          gad2_score?: number | null
          hope_rating?: number | null
          id?: string
          is_complete?: boolean | null
          medication_taken?: boolean | null
          mood_rating?: number | null
          notes?: string | null
          phq2_q1_response?: number | null
          phq2_q2_response?: number | null
          phq2_score?: number | null
          recovery_importance?: number | null
          recovery_strength?: string | null
          sleep_quality?: number | null
          sobriety_confidence?: number | null
          support_needed?: string | null
          triggers?: Json | null
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
      daily_pledges: {
        Row: {
          completed_evening: boolean | null
          completed_morning: boolean | null
          created_at: string
          evening_reflection: string | null
          id: string
          morning_commitment: string | null
          pledge_date: string
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_evening?: boolean | null
          completed_morning?: boolean | null
          created_at?: string
          evening_reflection?: string | null
          id?: string
          morning_commitment?: string | null
          pledge_date: string
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_evening?: boolean | null
          completed_morning?: boolean | null
          created_at?: string
          evening_reflection?: string | null
          id?: string
          morning_commitment?: string | null
          pledge_date?: string
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_quotes: {
        Row: {
          author: string | null
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          quote_text: string
          tags: Json | null
        }
        Insert: {
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          quote_text: string
          tags?: Json | null
        }
        Update: {
          author?: string | null
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          quote_text?: string
          tags?: Json | null
        }
        Relationships: []
      }
      data_export_logs: {
        Row: {
          action: string
          details_encrypted: string | null
          export_request_id: string
          id: string
          ip_address: unknown | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          details_encrypted?: string | null
          export_request_id: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          details_encrypted?: string | null
          export_request_id?: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          admin_approval_required: boolean | null
          approved_at: string | null
          approved_by: string | null
          checksum: string | null
          completed_at: string | null
          created_at: string
          data_categories: Json
          date_range_end: string | null
          date_range_start: string | null
          download_expires_at: string | null
          downloaded_at: string | null
          export_format: string
          export_metadata: Json | null
          file_size_bytes: number | null
          id: string
          request_reason: string
          secure_download_token: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          data_categories?: Json
          date_range_end?: string | null
          date_range_start?: string | null
          download_expires_at?: string | null
          downloaded_at?: string | null
          export_format?: string
          export_metadata?: Json | null
          file_size_bytes?: number | null
          id?: string
          request_reason: string
          secure_download_token?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_approval_required?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          data_categories?: Json
          date_range_end?: string | null
          date_range_start?: string | null
          download_expires_at?: string | null
          downloaded_at?: string | null
          export_format?: string
          export_metadata?: Json | null
          file_size_bytes?: number | null
          id?: string
          request_reason?: string
          secure_download_token?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      data_retention_log: {
        Row: {
          deleted_at: string | null
          deleted_by: string | null
          deletion_criteria: Json | null
          id: string
          records_deleted: number
          table_name: string
        }
        Insert: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_criteria?: Json | null
          id?: string
          records_deleted: number
          table_name: string
        }
        Update: {
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_criteria?: Json | null
          id?: string
          records_deleted?: number
          table_name?: string
        }
        Relationships: []
      }
      data_retention_policies: {
        Row: {
          auto_delete_enabled: boolean
          created_at: string
          created_by: string
          data_type: string
          deletion_method: string
          id: string
          is_active: boolean
          jurisdiction: string
          legal_hold_exempt: boolean
          notification_days_before: number
          policy_name: string
          retention_period_days: number
          updated_at: string
        }
        Insert: {
          auto_delete_enabled?: boolean
          created_at?: string
          created_by: string
          data_type: string
          deletion_method?: string
          id?: string
          is_active?: boolean
          jurisdiction?: string
          legal_hold_exempt?: boolean
          notification_days_before?: number
          policy_name: string
          retention_period_days: number
          updated_at?: string
        }
        Update: {
          auto_delete_enabled?: boolean
          created_at?: string
          created_by?: string
          data_type?: string
          deletion_method?: string
          id?: string
          is_active?: boolean
          jurisdiction?: string
          legal_hold_exempt?: boolean
          notification_days_before?: number
          policy_name?: string
          retention_period_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      data_retention_schedules: {
        Row: {
          created_at: string
          created_date: string
          data_id: string
          data_type: string
          deletion_completed_at: string | null
          deletion_status: string
          id: string
          legal_hold_applied: boolean
          notification_sent_date: string | null
          retention_policy_id: string
          scheduled_deletion_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_date: string
          data_id: string
          data_type: string
          deletion_completed_at?: string | null
          deletion_status?: string
          id?: string
          legal_hold_applied?: boolean
          notification_sent_date?: string | null
          retention_policy_id: string
          scheduled_deletion_date: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_date?: string
          data_id?: string
          data_type?: string
          deletion_completed_at?: string | null
          deletion_status?: string
          id?: string
          legal_hold_applied?: boolean
          notification_sent_date?: string | null
          retention_policy_id?: string
          scheduled_deletion_date?: string
          user_id?: string
        }
        Relationships: []
      }
      editing_sessions: {
        Row: {
          editing_section: string | null
          id: string
          is_active: boolean
          last_activity: string
          plan_id: string
          session_start: string
          user_id: string
        }
        Insert: {
          editing_section?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          plan_id: string
          session_start?: string
          user_id: string
        }
        Update: {
          editing_section?: string | null
          id?: string
          is_active?: boolean
          last_activity?: string
          plan_id?: string
          session_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editing_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
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
      error_logs: {
        Row: {
          app_version: string | null
          component_stack: string | null
          error_message: string
          error_stack: string | null
          id: string
          resolved: boolean | null
          timestamp: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          component_stack?: string | null
          error_message: string
          error_stack?: string | null
          id?: string
          resolved?: boolean | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          component_stack?: string | null
          error_message?: string
          error_stack?: string | null
          id?: string
          resolved?: boolean | null
          timestamp?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      forum_posts: {
        Row: {
          anonymous_name: string
          content: string
          created_at: string
          flagged_count: number | null
          forum_id: string
          id: string
          is_moderated: boolean | null
          last_activity: string | null
          moderation_status: string | null
          reply_count: number | null
          title: string
          user_id: string
        }
        Insert: {
          anonymous_name: string
          content: string
          created_at?: string
          flagged_count?: number | null
          forum_id: string
          id?: string
          is_moderated?: boolean | null
          last_activity?: string | null
          moderation_status?: string | null
          reply_count?: number | null
          title: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          content?: string
          created_at?: string
          flagged_count?: number | null
          forum_id?: string
          id?: string
          is_moderated?: boolean | null
          last_activity?: string | null
          moderation_status?: string | null
          reply_count?: number | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "community_forums"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_replies: {
        Row: {
          anonymous_name: string
          content: string
          created_at: string
          flagged_count: number | null
          id: string
          is_moderated: boolean | null
          moderation_status: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          anonymous_name: string
          content: string
          created_at?: string
          flagged_count?: number | null
          id?: string
          is_moderated?: boolean | null
          moderation_status?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          anonymous_name?: string
          content?: string
          created_at?: string
          flagged_count?: number | null
          id?: string
          is_moderated?: boolean | null
          moderation_status?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
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
      helper_availability: {
        Row: {
          availability_hours: Json | null
          created_at: string | null
          helped_count: number | null
          is_available: boolean | null
          last_helped: string | null
          notification_preferences: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          availability_hours?: Json | null
          created_at?: string | null
          helped_count?: number | null
          is_available?: boolean | null
          last_helped?: string | null
          notification_preferences?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          availability_hours?: Json | null
          created_at?: string | null
          helped_count?: number | null
          is_available?: boolean | null
          last_helped?: string | null
          notification_preferences?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      incident_responses: {
        Row: {
          affected_systems: Json | null
          affected_users_count: number | null
          breach_confirmed: boolean | null
          containment_actions: Json | null
          created_at: string
          data_types_affected: Json | null
          detected_at: string
          detected_by: string | null
          detection_method: string
          id: string
          incident_description: string
          incident_type: string
          lessons_learned: string | null
          notification_deadline: string | null
          regulatory_notification_required: boolean | null
          resolution_actions: Json | null
          resolved_at: string | null
          severity_level: string
          status: string
          updated_at: string
        }
        Insert: {
          affected_systems?: Json | null
          affected_users_count?: number | null
          breach_confirmed?: boolean | null
          containment_actions?: Json | null
          created_at?: string
          data_types_affected?: Json | null
          detected_at?: string
          detected_by?: string | null
          detection_method: string
          id?: string
          incident_description: string
          incident_type: string
          lessons_learned?: string | null
          notification_deadline?: string | null
          regulatory_notification_required?: boolean | null
          resolution_actions?: Json | null
          resolved_at?: string | null
          severity_level: string
          status?: string
          updated_at?: string
        }
        Update: {
          affected_systems?: Json | null
          affected_users_count?: number | null
          breach_confirmed?: boolean | null
          containment_actions?: Json | null
          created_at?: string
          data_types_affected?: Json | null
          detected_at?: string
          detected_by?: string | null
          detection_method?: string
          id?: string
          incident_description?: string
          incident_type?: string
          lessons_learned?: string | null
          notification_deadline?: string | null
          regulatory_notification_required?: boolean | null
          resolution_actions?: Json | null
          resolved_at?: string | null
          severity_level?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      location_shares: {
        Row: {
          address: string | null
          expires_at: string | null
          id: string
          is_emergency: boolean
          latitude: number
          longitude: number
          patient_id: string
          shared_at: string
          shared_with_supporter_id: string
        }
        Insert: {
          address?: string | null
          expires_at?: string | null
          id?: string
          is_emergency?: boolean
          latitude: number
          longitude: number
          patient_id: string
          shared_at?: string
          shared_with_supporter_id: string
        }
        Update: {
          address?: string | null
          expires_at?: string | null
          id?: string
          is_emergency?: boolean
          latitude?: number
          longitude?: number
          patient_id?: string
          shared_at?: string
          shared_with_supporter_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          message_text: string
          template_category: string
          template_name: string
          updated_at: string | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_text: string
          template_category: string
          template_name: string
          updated_at?: string | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          message_text?: string
          template_category?: string
          template_name?: string
          updated_at?: string | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      moderation_queue: {
        Row: {
          ai_confidence: number | null
          content_id: string
          content_type: string
          created_at: string
          crisis_risk: string | null
          flag_reason: string
          id: string
          priority: string
          reviewed_at: string | null
          reviewed_by: string | null
          sentiment: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          content_id: string
          content_type: string
          created_at?: string
          crisis_risk?: string | null
          flag_reason: string
          id?: string
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sentiment?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          content_id?: string
          content_type?: string
          created_at?: string
          crisis_risk?: string | null
          flag_reason?: string
          id?: string
          priority?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sentiment?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      notification_ab_tests: {
        Row: {
          channel: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          notification_type: string
          start_date: string
          success_metric: string | null
          traffic_split: number | null
          variant_a_template_id: string | null
          variant_b_template_id: string | null
        }
        Insert: {
          channel: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notification_type: string
          start_date?: string
          success_metric?: string | null
          traffic_split?: number | null
          variant_a_template_id?: string | null
          variant_b_template_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notification_type?: string
          start_date?: string
          success_metric?: string | null
          traffic_split?: number | null
          variant_a_template_id?: string | null
          variant_b_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_ab_tests_variant_a_template_id_fkey"
            columns: ["variant_a_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_ab_tests_variant_b_template_id_fkey"
            columns: ["variant_b_template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_analytics: {
        Row: {
          channel: string
          event_data: Json | null
          event_type: string
          id: string
          notification_id: string | null
          template_id: string | null
          timestamp: string
          type: string
          user_id: string
        }
        Insert: {
          channel: string
          event_data?: Json | null
          event_type: string
          id?: string
          notification_id?: string | null
          template_id?: string | null
          timestamp?: string
          type: string
          user_id: string
        }
        Update: {
          channel?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          notification_id?: string | null
          template_id?: string | null
          timestamp?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_analytics_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_analytics_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_batches: {
        Row: {
          batch_type: string
          created_at: string
          id: string
          notification_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          batch_type: string
          created_at?: string
          id?: string
          notification_count?: number | null
          scheduled_for: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          batch_type?: string
          created_at?: string
          id?: string
          notification_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_delivery_log: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_method: string
          delivery_status: string | null
          error_message: string | null
          id: string
          notification_id: string
          retry_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_method: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          notification_id: string
          retry_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_method?: string
          delivery_status?: string | null
          error_message?: string | null
          id?: string
          notification_id?: string
          retry_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "recovery_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          appointment_channels: Json | null
          batch_delay_minutes: number | null
          batch_similar_notifications: boolean | null
          check_in_channels: Json | null
          community_channels: Json | null
          created_at: string
          crisis_channels: Json | null
          emergency_override: boolean | null
          global_unsubscribe: boolean | null
          goal_deadline_channels: Json | null
          id: string
          language_preference: string | null
          max_daily_notifications: number | null
          max_hourly_notifications: number | null
          optimal_delivery_enabled: boolean | null
          provider_channels: Json | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          system_channels: Json | null
          unsubscribe_token: string | null
          unsubscribed_types: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_channels?: Json | null
          batch_delay_minutes?: number | null
          batch_similar_notifications?: boolean | null
          check_in_channels?: Json | null
          community_channels?: Json | null
          created_at?: string
          crisis_channels?: Json | null
          emergency_override?: boolean | null
          global_unsubscribe?: boolean | null
          goal_deadline_channels?: Json | null
          id?: string
          language_preference?: string | null
          max_daily_notifications?: number | null
          max_hourly_notifications?: number | null
          optimal_delivery_enabled?: boolean | null
          provider_channels?: Json | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          system_channels?: Json | null
          unsubscribe_token?: string | null
          unsubscribed_types?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_channels?: Json | null
          batch_delay_minutes?: number | null
          batch_similar_notifications?: boolean | null
          check_in_channels?: Json | null
          community_channels?: Json | null
          created_at?: string
          crisis_channels?: Json | null
          emergency_override?: boolean | null
          global_unsubscribe?: boolean | null
          goal_deadline_channels?: Json | null
          id?: string
          language_preference?: string | null
          max_daily_notifications?: number | null
          max_hourly_notifications?: number | null
          optimal_delivery_enabled?: boolean | null
          provider_channels?: Json | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          system_channels?: Json | null
          unsubscribe_token?: string | null
          unsubscribed_types?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          body: string
          channel: string
          clicked_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          opened_at: string | null
          priority: number | null
          recipient_address: string | null
          retry_count: number | null
          scheduled_for: string
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          body: string
          channel: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          opened_at?: string | null
          priority?: number | null
          recipient_address?: string | null
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          body?: string
          channel?: string
          clicked_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          opened_at?: string | null
          priority?: number | null
          recipient_address?: string | null
          retry_count?: number | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_templates: {
        Row: {
          body_template: string
          channel: string
          created_at: string
          id: string
          is_active: boolean | null
          language_code: string | null
          name: string
          subject_template: string | null
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          body_template: string
          channel: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          language_code?: string | null
          name: string
          subject_template?: string | null
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          body_template?: string
          channel?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          language_code?: string | null
          name?: string
          subject_template?: string | null
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      outcome_measures: {
        Row: {
          baseline_score: number | null
          clinical_significance: boolean | null
          created_at: string
          current_score: number | null
          id: string
          improvement_percentage: number | null
          measure_type: string
          measurement_date: string
          notes: string | null
          provider_id: string | null
          target_score: number | null
          user_id: string
        }
        Insert: {
          baseline_score?: number | null
          clinical_significance?: boolean | null
          created_at?: string
          current_score?: number | null
          id?: string
          improvement_percentage?: number | null
          measure_type: string
          measurement_date?: string
          notes?: string | null
          provider_id?: string | null
          target_score?: number | null
          user_id: string
        }
        Update: {
          baseline_score?: number | null
          clinical_significance?: boolean | null
          created_at?: string
          current_score?: number | null
          id?: string
          improvement_percentage?: number | null
          measure_type?: string
          measurement_date?: string
          notes?: string | null
          provider_id?: string | null
          target_score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      partnership_checkins: {
        Row: {
          acknowledged_by_partner: boolean | null
          checkin_date: string
          created_at: string
          encrypted_data: string
          id: string
          partnership_id: string
          reminder_sent: boolean | null
          shared_summary: Json
          user_id: string
        }
        Insert: {
          acknowledged_by_partner?: boolean | null
          checkin_date: string
          created_at?: string
          encrypted_data: string
          id?: string
          partnership_id: string
          reminder_sent?: boolean | null
          shared_summary?: Json
          user_id: string
        }
        Update: {
          acknowledged_by_partner?: boolean | null
          checkin_date?: string
          created_at?: string
          encrypted_data?: string
          id?: string
          partnership_id?: string
          reminder_sent?: boolean | null
          shared_summary?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_checkins_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          partnership_id: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          partnership_id: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          partnership_id?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_notifications_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "accountability_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_provider_relationships: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          provider_id: string
          relationship_type: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          provider_id: string
          relationship_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          provider_id?: string
          relationship_type?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      peer_chat_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          delivered_at: string | null
          edited_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          message_text: string
          message_type: string | null
          reactions: Json | null
          read_at: string | null
          reply_to_message_id: string | null
          search_vector: unknown | null
          sender_id: string
          sender_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_text: string
          message_type?: string | null
          reactions?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          search_vector?: unknown | null
          sender_id: string
          sender_type: string
          session_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          delivered_at?: string | null
          edited_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          message_text?: string
          message_type?: string | null
          reactions?: Json | null
          read_at?: string | null
          reply_to_message_id?: string | null
          search_vector?: unknown | null
          sender_id?: string
          sender_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_chat_messages_reply_to_message_id_fkey"
            columns: ["reply_to_message_id"]
            isOneToOne: false
            referencedRelation: "peer_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_chat_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          escalated_to_crisis: boolean | null
          escalation_reason: string | null
          id: string
          peer_supporter_id: string
          priority: string
          started_at: string | null
          status: string
          supporter_notes: string | null
          updated_at: string
          user_feedback: string | null
          user_id: string
          user_rating: number | null
          wait_time_minutes: number | null
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          escalated_to_crisis?: boolean | null
          escalation_reason?: string | null
          id?: string
          peer_supporter_id: string
          priority?: string
          started_at?: string | null
          status?: string
          supporter_notes?: string | null
          updated_at?: string
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
          wait_time_minutes?: number | null
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          escalated_to_crisis?: boolean | null
          escalation_reason?: string | null
          id?: string
          peer_supporter_id?: string
          priority?: string
          started_at?: string | null
          status?: string
          supporter_notes?: string | null
          updated_at?: string
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
          wait_time_minutes?: number | null
        }
        Relationships: []
      }
      peer_chat_typing: {
        Row: {
          id: string
          is_typing: boolean | null
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_typing?: boolean | null
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_typing?: boolean | null
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_message_audit: {
        Row: {
          action: string
          id: string
          message_id: string
          metadata: Json | null
          new_content: string | null
          old_content: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          action: string
          id?: string
          message_id: string
          metadata?: Json | null
          new_content?: string | null
          old_content?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          action?: string
          id?: string
          message_id?: string
          metadata?: Json | null
          new_content?: string | null
          old_content?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_message_audit_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "peer_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_message_bookmarks: {
        Row: {
          created_at: string
          id: string
          message_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "peer_message_bookmarks_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "peer_chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      peer_support_queue: {
        Row: {
          callback_phone: string | null
          callback_requested: boolean | null
          created_at: string
          estimated_wait_minutes: number | null
          id: string
          issue_description: string | null
          last_position_update: string | null
          preferred_supporter_id: string | null
          priority: string
          queue_position: number | null
          scheduled_time: string | null
          user_id: string
          wait_started_at: string | null
        }
        Insert: {
          callback_phone?: string | null
          callback_requested?: boolean | null
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          issue_description?: string | null
          last_position_update?: string | null
          preferred_supporter_id?: string | null
          priority?: string
          queue_position?: number | null
          scheduled_time?: string | null
          user_id: string
          wait_started_at?: string | null
        }
        Update: {
          callback_phone?: string | null
          callback_requested?: boolean | null
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          issue_description?: string | null
          last_position_update?: string | null
          preferred_supporter_id?: string | null
          priority?: string
          queue_position?: number | null
          scheduled_time?: string | null
          user_id?: string
          wait_started_at?: string | null
        }
        Relationships: []
      }
      peer_supporter_presence: {
        Row: {
          custom_message: string | null
          id: string
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          custom_message?: string | null
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          custom_message?: string | null
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_supporters: {
        Row: {
          availability_schedule: Json | null
          average_rating: number | null
          bio: string | null
          certifications: Json | null
          created_at: string
          current_chat_count: number | null
          display_name: string
          id: string
          is_available: boolean | null
          languages: Json | null
          max_concurrent_chats: number | null
          specialties: Json | null
          total_chats_completed: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string
          current_chat_count?: number | null
          display_name: string
          id?: string
          is_available?: boolean | null
          languages?: Json | null
          max_concurrent_chats?: number | null
          specialties?: Json | null
          total_chats_completed?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          certifications?: Json | null
          created_at?: string
          current_chat_count?: number | null
          display_name?: string
          id?: string
          is_available?: boolean | null
          languages?: Json | null
          max_concurrent_chats?: number | null
          specialties?: Json | null
          total_chats_completed?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      peer_video_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          meeting_link: string | null
          peer_supporter_id: string
          preparation_notes: string | null
          scheduled_at: string
          session_notes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          peer_supporter_id: string
          preparation_notes?: string | null
          scheduled_at: string
          session_notes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          meeting_link?: string | null
          peer_supporter_id?: string
          preparation_notes?: string | null
          scheduled_at?: string
          session_notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_motivations: {
        Row: {
          content: string
          content_type: string
          created_at: string
          id: string
          image_url: string | null
          is_favorite: boolean | null
          source: string | null
          tags: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          source?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_favorite?: boolean | null
          source?: string | null
          tags?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_collaborators: {
        Row: {
          collaborator_id: string
          created_at: string
          id: string
          invited_by: string
          permissions: Json
          plan_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          collaborator_id: string
          created_at?: string
          id?: string
          invited_by: string
          permissions?: Json
          plan_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          collaborator_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          permissions?: Json
          plan_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_collaborators_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_comments: {
        Row: {
          author_id: string
          comment_type: string
          content: string
          created_at: string
          goal_id: string | null
          id: string
          is_resolved: boolean
          parent_comment_id: string | null
          plan_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          comment_type?: string
          content: string
          created_at?: string
          goal_id?: string | null
          id?: string
          is_resolved?: boolean
          parent_comment_id?: string | null
          plan_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          comment_type?: string
          content?: string
          created_at?: string
          goal_id?: string | null
          id?: string
          is_resolved?: boolean
          parent_comment_id?: string | null
          plan_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_comments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "recovery_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "plan_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_comments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_versions: {
        Row: {
          change_type: string
          changed_by: string
          changes_summary: string | null
          created_at: string
          current_data: Json | null
          id: string
          plan_id: string
          previous_data: Json | null
          version_number: number
        }
        Insert: {
          change_type: string
          changed_by: string
          changes_summary?: string | null
          created_at?: string
          current_data?: Json | null
          id?: string
          plan_id: string
          previous_data?: Json | null
          version_number: number
        }
        Update: {
          change_type?: string
          changed_by?: string
          changes_summary?: string | null
          created_at?: string
          current_data?: Json | null
          id?: string
          plan_id?: string
          previous_data?: Json | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_versions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pledge_templates: {
        Row: {
          category: string
          created_at: string
          evening_prompt: string
          id: string
          is_default: boolean | null
          morning_prompt: string
          title: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          evening_prompt: string
          id?: string
          is_default?: boolean | null
          morning_prompt: string
          title: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          evening_prompt?: string
          id?: string
          is_default?: boolean | null
          morning_prompt?: string
          title?: string
          user_id?: string | null
        }
        Relationships: []
      }
      positive_reinforcements: {
        Row: {
          acknowledged: boolean | null
          delivered_at: string | null
          id: string
          message: string
          reinforcement_type: string
          support_request_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged?: boolean | null
          delivered_at?: string | null
          id?: string
          message: string
          reinforcement_type: string
          support_request_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged?: boolean | null
          delivered_at?: string | null
          id?: string
          message?: string
          reinforcement_type?: string
          support_request_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positive_reinforcements_support_request_id_fkey"
            columns: ["support_request_id"]
            isOneToOne: false
            referencedRelation: "support_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          completed_at: string | null
          id: string
          session_type: string
          streak_count: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          session_type: string
          streak_count?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          session_type?: string
          streak_count?: number | null
          user_id?: string
        }
        Relationships: []
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
      provider_availability: {
        Row: {
          appointment_duration_minutes: number | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          provider_id: string
          start_time: string
        }
        Insert: {
          appointment_duration_minutes?: number | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          provider_id: string
          start_time: string
        }
        Update: {
          appointment_duration_minutes?: number | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_connection_requests: {
        Row: {
          id: string
          patient_id: string
          provider_id: string
          provider_response: string | null
          request_message: string | null
          requested_at: string
          responded_at: string | null
          share_crisis_events: boolean | null
          share_daily_checkins: boolean | null
          share_goal_progress: boolean | null
          share_mood_data: boolean | null
          status: string
        }
        Insert: {
          id?: string
          patient_id: string
          provider_id: string
          provider_response?: string | null
          request_message?: string | null
          requested_at?: string
          responded_at?: string | null
          share_crisis_events?: boolean | null
          share_daily_checkins?: boolean | null
          share_goal_progress?: boolean | null
          share_mood_data?: boolean | null
          status?: string
        }
        Update: {
          id?: string
          patient_id?: string
          provider_id?: string
          provider_response?: string | null
          request_message?: string | null
          requested_at?: string
          responded_at?: string | null
          share_crisis_events?: boolean | null
          share_daily_checkins?: boolean | null
          share_goal_progress?: boolean | null
          share_mood_data?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_connection_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitation_message: string | null
          invited_by: string
          patient_email: string
          patient_name: string | null
          provider_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_message?: string | null
          invited_by: string
          patient_email: string
          patient_name?: string | null
          provider_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitation_message?: string | null
          invited_by?: string
          patient_email?: string
          patient_name?: string | null
          provider_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_invitations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_patient_assignments: {
        Row: {
          assigned_at: string | null
          assignment_type: string | null
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string | null
          provider_id: string | null
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assignment_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          provider_id?: string | null
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assignment_type?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          provider_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      provider_plan_access: {
        Row: {
          access_granted_at: string | null
          access_level: string
          created_at: string
          expiry_date: string | null
          id: string
          invitation_sent_at: string | null
          last_accessed_at: string | null
          plan_id: string
          provider_email: string
          provider_name: string | null
          user_id: string
        }
        Insert: {
          access_granted_at?: string | null
          access_level?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          invitation_sent_at?: string | null
          last_accessed_at?: string | null
          plan_id: string
          provider_email: string
          provider_name?: string | null
          user_id: string
        }
        Update: {
          access_granted_at?: string | null
          access_level?: string
          created_at?: string
          expiry_date?: string | null
          id?: string
          invitation_sent_at?: string | null
          last_accessed_at?: string | null
          plan_id?: string
          provider_email?: string
          provider_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_plan_access_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_registration_requests: {
        Row: {
          admin_approval_status: string
          approval_notes: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          license_number: string | null
          license_state: string | null
          license_verification_status: string
          phone_number: string | null
          practice_address: string | null
          practice_name: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
          user_id: string
          verification_documents: Json | null
        }
        Insert: {
          admin_approval_status?: string
          approval_notes?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          license_number?: string | null
          license_state?: string | null
          license_verification_status?: string
          phone_number?: string | null
          practice_address?: string | null
          practice_name?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id: string
          verification_documents?: Json | null
        }
        Update: {
          admin_approval_status?: string
          approval_notes?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          license_number?: string | null
          license_state?: string | null
          license_verification_status?: string
          phone_number?: string | null
          practice_address?: string | null
          practice_name?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
          user_id?: string
          verification_documents?: Json | null
        }
        Relationships: []
      }
      provider_reviews: {
        Row: {
          created_at: string
          flagged_count: number | null
          id: string
          is_anonymous: boolean | null
          is_approved: boolean | null
          is_verified_patient: boolean | null
          moderation_notes: string | null
          provider_id: string
          rating: number
          review_text: string | null
          reviewer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flagged_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          is_verified_patient?: boolean | null
          moderation_notes?: string | null
          provider_id: string
          rating: number
          review_text?: string | null
          reviewer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flagged_count?: number | null
          id?: string
          is_anonymous?: boolean | null
          is_approved?: boolean | null
          is_verified_patient?: boolean | null
          moderation_notes?: string | null
          provider_id?: string
          rating?: number
          review_text?: string | null
          reviewer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_reviews_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_shared: boolean
          provider_id: string
          template_data: Json
          title: string
          updated_at: string
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          provider_id: string
          template_data: Json
          title: string
          updated_at?: string
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_shared?: boolean
          provider_id?: string
          template_data?: Json
          title?: string
          updated_at?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          accepted_payment_methods: Json | null
          accepting_new_patients: boolean | null
          availability_schedule: Json | null
          average_rating: number | null
          bio: string | null
          booking_url: string | null
          created_at: string
          credentials: Json
          current_patient_count: number | null
          email: string | null
          id: string
          insurance_accepted: Json | null
          is_remote: boolean | null
          is_verified: boolean | null
          languages: Json
          license_number: string | null
          license_state: string | null
          location_address: string | null
          location_city: string | null
          location_state: string
          max_patients: number | null
          name: string
          npi_number: string | null
          phone_number: string | null
          photo_url: string | null
          practice_name: string | null
          sliding_scale_available: boolean | null
          specialties: Json
          status: string | null
          tags: Json | null
          title: string
          total_reviews: number | null
          updated_at: string
          user_id: string | null
          verification_date: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          accepted_payment_methods?: Json | null
          accepting_new_patients?: boolean | null
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          booking_url?: string | null
          created_at?: string
          credentials?: Json
          current_patient_count?: number | null
          email?: string | null
          id?: string
          insurance_accepted?: Json | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          languages?: Json
          license_number?: string | null
          license_state?: string | null
          location_address?: string | null
          location_city?: string | null
          location_state: string
          max_patients?: number | null
          name: string
          npi_number?: string | null
          phone_number?: string | null
          photo_url?: string | null
          practice_name?: string | null
          sliding_scale_available?: boolean | null
          specialties?: Json
          status?: string | null
          tags?: Json | null
          title: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          verification_date?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          accepted_payment_methods?: Json | null
          accepting_new_patients?: boolean | null
          availability_schedule?: Json | null
          average_rating?: number | null
          bio?: string | null
          booking_url?: string | null
          created_at?: string
          credentials?: Json
          current_patient_count?: number | null
          email?: string | null
          id?: string
          insurance_accepted?: Json | null
          is_remote?: boolean | null
          is_verified?: boolean | null
          languages?: Json
          license_number?: string | null
          license_state?: string | null
          location_address?: string | null
          location_city?: string | null
          location_state?: string
          max_patients?: number | null
          name?: string
          npi_number?: string | null
          phone_number?: string | null
          photo_url?: string | null
          practice_name?: string | null
          sliding_scale_available?: boolean | null
          specialties?: Json
          status?: string | null
          tags?: Json | null
          title?: string
          total_reviews?: number | null
          updated_at?: string
          user_id?: string | null
          verification_date?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      realtime_notifications: {
        Row: {
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_drill_schedules: {
        Row: {
          actual_recovery_time_minutes: number | null
          completed_at: string | null
          conducted_by: string | null
          created_at: string
          drill_name: string
          drill_type: string
          id: string
          next_drill_date: string | null
          results: Json | null
          scheduled_date: string
          status: string
          success_criteria: Json
          target_recovery_time_minutes: number
        }
        Insert: {
          actual_recovery_time_minutes?: number | null
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string
          drill_name: string
          drill_type: string
          id?: string
          next_drill_date?: string | null
          results?: Json | null
          scheduled_date: string
          status?: string
          success_criteria?: Json
          target_recovery_time_minutes: number
        }
        Update: {
          actual_recovery_time_minutes?: number | null
          completed_at?: string | null
          conducted_by?: string | null
          created_at?: string
          drill_name?: string
          drill_type?: string
          id?: string
          next_drill_date?: string | null
          results?: Json | null
          scheduled_date?: string
          status?: string
          success_criteria?: Json
          target_recovery_time_minutes?: number
        }
        Relationships: []
      }
      recovery_goals: {
        Row: {
          accountability_partner_id: string | null
          approved_at: string | null
          approved_by: string | null
          category: string
          completed_at: string | null
          created_at: string
          current_value: number | null
          description: string
          id: string
          milestones: Json | null
          next_reminder: string | null
          pause_reason: string | null
          plan_id: string | null
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
          approved_at?: string | null
          approved_by?: string | null
          category: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description: string
          id?: string
          milestones?: Json | null
          next_reminder?: string | null
          pause_reason?: string | null
          plan_id?: string | null
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
          approved_at?: string | null
          approved_by?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string
          current_value?: number | null
          description?: string
          id?: string
          milestones?: Json | null
          next_reminder?: string | null
          pause_reason?: string | null
          plan_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "recovery_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_milestones: {
        Row: {
          achieved_date: string | null
          achievement_criteria: string | null
          celebration_data: Json | null
          celebration_type: string | null
          created_at: string
          description: string | null
          goal_id: string | null
          id: string
          is_achieved: boolean | null
          milestone_date: string
          plan_id: string
          title: string
          user_id: string
        }
        Insert: {
          achieved_date?: string | null
          achievement_criteria?: string | null
          celebration_data?: Json | null
          celebration_type?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          is_achieved?: boolean | null
          milestone_date: string
          plan_id: string
          title: string
          user_id: string
        }
        Update: {
          achieved_date?: string | null
          achievement_criteria?: string | null
          celebration_data?: Json | null
          celebration_type?: string | null
          created_at?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          is_achieved?: boolean | null
          milestone_date?: string
          plan_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_milestones_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "recovery_plan_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_milestones_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_notification_preferences: {
        Row: {
          activity_pattern_data: Json | null
          created_at: string
          daily_limit: number | null
          delivery_methods: Json | null
          goal_reminder_days_before: Json | null
          goal_reminder_time: string | null
          goal_reminders_enabled: boolean | null
          id: string
          milestone_celebrations_enabled: boolean | null
          optimal_send_time: string | null
          progress_encouragement_enabled: boolean | null
          quiet_hours: Json | null
          streak_milestones: Json | null
          streak_notifications_enabled: boolean | null
          updated_at: string
          user_id: string
          weekly_summary_day: number | null
          weekly_summary_enabled: boolean | null
        }
        Insert: {
          activity_pattern_data?: Json | null
          created_at?: string
          daily_limit?: number | null
          delivery_methods?: Json | null
          goal_reminder_days_before?: Json | null
          goal_reminder_time?: string | null
          goal_reminders_enabled?: boolean | null
          id?: string
          milestone_celebrations_enabled?: boolean | null
          optimal_send_time?: string | null
          progress_encouragement_enabled?: boolean | null
          quiet_hours?: Json | null
          streak_milestones?: Json | null
          streak_notifications_enabled?: boolean | null
          updated_at?: string
          user_id: string
          weekly_summary_day?: number | null
          weekly_summary_enabled?: boolean | null
        }
        Update: {
          activity_pattern_data?: Json | null
          created_at?: string
          daily_limit?: number | null
          delivery_methods?: Json | null
          goal_reminder_days_before?: Json | null
          goal_reminder_time?: string | null
          goal_reminders_enabled?: boolean | null
          id?: string
          milestone_celebrations_enabled?: boolean | null
          optimal_send_time?: string | null
          progress_encouragement_enabled?: boolean | null
          quiet_hours?: Json | null
          streak_milestones?: Json | null
          streak_notifications_enabled?: boolean | null
          updated_at?: string
          user_id?: string
          weekly_summary_day?: number | null
          weekly_summary_enabled?: boolean | null
        }
        Relationships: []
      }
      recovery_notifications: {
        Row: {
          created_at: string
          data: Json | null
          delivered_at: string | null
          delivery_methods: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          priority: string | null
          scheduled_for: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          delivery_methods?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          priority?: string | null
          scheduled_for?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          delivery_methods?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          priority?: string | null
          scheduled_for?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      recovery_plan_goals: {
        Row: {
          category: string | null
          completion_date: string | null
          created_at: string
          current_value: number | null
          description: string | null
          due_date: string | null
          goal_type: string
          id: string
          next_reminder_date: string | null
          notes: string | null
          plan_id: string
          priority_order: number | null
          reminder_frequency: string | null
          smart_criteria: Json
          status: string
          target_value: number | null
          title: string
          unit_of_measure: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          completion_date?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          goal_type: string
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          plan_id: string
          priority_order?: number | null
          reminder_frequency?: string | null
          smart_criteria?: Json
          status?: string
          target_value?: number | null
          title: string
          unit_of_measure?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          completion_date?: string | null
          created_at?: string
          current_value?: number | null
          description?: string | null
          due_date?: string | null
          goal_type?: string
          id?: string
          next_reminder_date?: string | null
          notes?: string | null
          plan_id?: string
          priority_order?: number | null
          reminder_frequency?: string | null
          smart_criteria?: Json
          status?: string
          target_value?: number | null
          title?: string
          unit_of_measure?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recovery_plan_goals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_recovery_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recovery_plan_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          difficulty_level: string
          estimated_duration_weeks: number | null
          evidence_based_source: string | null
          id: string
          is_default: boolean | null
          template_data: Json
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration_weeks?: number | null
          evidence_based_source?: string | null
          id?: string
          is_default?: boolean | null
          template_data?: Json
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          difficulty_level?: string
          estimated_duration_weeks?: number | null
          evidence_based_source?: string | null
          id?: string
          is_default?: boolean | null
          template_data?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      recovery_plans: {
        Row: {
          created_at: string
          created_by: string
          current_version: number
          description: string | null
          id: string
          is_collaborative: boolean
          last_edited_at: string | null
          last_edited_by: string | null
          patient_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_version?: number
          description?: string | null
          id?: string
          is_collaborative?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          patient_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_version?: number
          description?: string | null
          id?: string
          is_collaborative?: boolean
          last_edited_at?: string | null
          last_edited_by?: string | null
          patient_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_notifications: {
        Row: {
          confirmation_received: boolean | null
          created_at: string
          deadline: string
          id: string
          incident_id: string
          jurisdiction: string
          notification_content: string | null
          notification_type: string
          reference_number: string | null
          regulator_name: string
          status: string
          submitted_at: string | null
        }
        Insert: {
          confirmation_received?: boolean | null
          created_at?: string
          deadline: string
          id?: string
          incident_id: string
          jurisdiction: string
          notification_content?: string | null
          notification_type: string
          reference_number?: string | null
          regulator_name: string
          status?: string
          submitted_at?: string | null
        }
        Update: {
          confirmation_received?: boolean | null
          created_at?: string
          deadline?: string
          id?: string
          incident_id?: string
          jurisdiction?: string
          notification_content?: string | null
          notification_type?: string
          reference_number?: string | null
          regulator_name?: string
          status?: string
          submitted_at?: string | null
        }
        Relationships: []
      }
      saved_providers: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_providers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_logs: {
        Row: {
          event_type: string
          id: string
          ip_address: unknown | null
          metadata: Json | null
          risk_level: string
          session_id: string | null
          timestamp: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          risk_level: string
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          ip_address?: unknown | null
          metadata?: Json | null
          risk_level?: string
          session_id?: string | null
          timestamp?: string | null
          user_agent?: string | null
          user_id?: string | null
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
      sponsor_matches: {
        Row: {
          contact_initiated_at: string | null
          created_at: string
          id: string
          match_score: number | null
          matched_criteria: Json | null
          sponsee_user_id: string
          sponsor_user_id: string
          status: string | null
        }
        Insert: {
          contact_initiated_at?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          matched_criteria?: Json | null
          sponsee_user_id: string
          sponsor_user_id: string
          status?: string | null
        }
        Update: {
          contact_initiated_at?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          matched_criteria?: Json | null
          sponsee_user_id?: string
          sponsor_user_id?: string
          status?: string | null
        }
        Relationships: []
      }
      sponsor_profiles: {
        Row: {
          bio: string | null
          communication_style: string | null
          created_at: string
          current_sponsees: number | null
          display_name: string
          id: string
          is_available: boolean | null
          location_general: string | null
          max_sponsees: number | null
          meeting_preference: string | null
          program_type: string
          recovery_approach: string | null
          updated_at: string
          user_id: string
          years_sober: number
        }
        Insert: {
          bio?: string | null
          communication_style?: string | null
          created_at?: string
          current_sponsees?: number | null
          display_name: string
          id?: string
          is_available?: boolean | null
          location_general?: string | null
          max_sponsees?: number | null
          meeting_preference?: string | null
          program_type: string
          recovery_approach?: string | null
          updated_at?: string
          user_id: string
          years_sober: number
        }
        Update: {
          bio?: string | null
          communication_style?: string | null
          created_at?: string
          current_sponsees?: number | null
          display_name?: string
          id?: string
          is_available?: boolean | null
          location_general?: string | null
          max_sponsees?: number | null
          meeting_preference?: string | null
          program_type?: string
          recovery_approach?: string | null
          updated_at?: string
          user_id?: string
          years_sober?: number
        }
        Relationships: []
      }
      story_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          story_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type: string
          story_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          story_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_interactions_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "success_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      success_stories: {
        Row: {
          anonymous_name: string | null
          content: string
          created_at: string
          id: string
          is_anonymous: boolean | null
          is_featured: boolean | null
          is_moderated: boolean | null
          likes_count: number | null
          moderation_status: string | null
          recovery_duration_days: number | null
          story_category: string
          title: string
          user_id: string
          views_count: number | null
        }
        Insert: {
          anonymous_name?: string | null
          content: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_featured?: boolean | null
          is_moderated?: boolean | null
          likes_count?: number | null
          moderation_status?: string | null
          recovery_duration_days?: number | null
          story_category: string
          title: string
          user_id: string
          views_count?: number | null
        }
        Update: {
          anonymous_name?: string | null
          content?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean | null
          is_featured?: boolean | null
          is_moderated?: boolean | null
          likes_count?: number | null
          moderation_status?: string | null
          recovery_duration_days?: number | null
          story_category?: string
          title?: string
          user_id?: string
          views_count?: number | null
        }
        Relationships: []
      }
      support_agreement_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          template_content: Json
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          template_content: Json
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          template_content?: Json
          title?: string
        }
        Relationships: []
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
      support_member_presence: {
        Row: {
          created_at: string
          do_not_disturb: boolean
          id: string
          last_seen: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          do_not_disturb?: boolean
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          do_not_disturb?: boolean
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          location_data: Json | null
          message: string
          message_type: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_data?: Json | null
          message: string
          message_type?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_data?: Json | null
          message?: string
          message_type?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      support_network: {
        Row: {
          created_at: string
          id: string
          last_activity: string | null
          patient_id: string
          permissions: Json
          relationship_type: string
          status: string
          support_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_activity?: string | null
          patient_id: string
          permissions?: Json
          relationship_type: string
          status?: string
          support_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_activity?: string | null
          patient_id?: string
          permissions?: Json
          relationship_type?: string
          status?: string
          support_member_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_notification_preferences: {
        Row: {
          alert_types: Json
          contact_methods: Json
          created_at: string
          frequency_limits: Json
          id: string
          quiet_hours: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_types?: Json
          contact_methods?: Json
          created_at?: string
          frequency_limits?: Json
          id?: string
          quiet_hours?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_types?: Json
          contact_methods?: Json
          created_at?: string
          frequency_limits?: Json
          id?: string
          quiet_hours?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_privacy_settings: {
        Row: {
          auto_delete_history_hours: number | null
          created_at: string | null
          escalation_delay_minutes: number | null
          incognito_mode: boolean | null
          pause_alerts_until: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_delete_history_hours?: number | null
          created_at?: string | null
          escalation_delay_minutes?: number | null
          incognito_mode?: boolean | null
          pause_alerts_until?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_delete_history_hours?: number | null
          created_at?: string | null
          escalation_delay_minutes?: number | null
          incognito_mode?: boolean | null
          pause_alerts_until?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          anonymous_send: boolean | null
          contacts_notified: number | null
          created_at: string | null
          deleted_at: string | null
          id: string
          message_sent: string
          request_type: Database["public"]["Enums"]["support_request_type"]
          responded_at: string | null
          response_count: number | null
          sponsor_only: boolean | null
          user_id: string
        }
        Insert: {
          anonymous_send?: boolean | null
          contacts_notified?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          message_sent: string
          request_type: Database["public"]["Enums"]["support_request_type"]
          responded_at?: string | null
          response_count?: number | null
          sponsor_only?: boolean | null
          user_id: string
        }
        Update: {
          anonymous_send?: boolean | null
          contacts_notified?: number | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          message_sent?: string
          request_type?: Database["public"]["Enums"]["support_request_type"]
          responded_at?: string | null
          response_count?: number | null
          sponsor_only?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      support_stats: {
        Row: {
          average_response_minutes: number | null
          connection_requests: number | null
          crisis_requests: number | null
          date: string
          peak_hour: number | null
          practice_requests: number | null
          total_helpers_available: number | null
          total_requests: number | null
          tough_day_requests: number | null
          updated_at: string | null
        }
        Insert: {
          average_response_minutes?: number | null
          connection_requests?: number | null
          crisis_requests?: number | null
          date?: string
          peak_hour?: number | null
          practice_requests?: number | null
          total_helpers_available?: number | null
          total_requests?: number | null
          tough_day_requests?: number | null
          updated_at?: string | null
        }
        Update: {
          average_response_minutes?: number | null
          connection_requests?: number | null
          crisis_requests?: number | null
          date?: string
          peak_hour?: number | null
          practice_requests?: number | null
          total_helpers_available?: number | null
          total_requests?: number | null
          tough_day_requests?: number | null
          updated_at?: string | null
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
      treatment_plans: {
        Row: {
          created_at: string
          effectiveness_rating: number | null
          goals: Json | null
          id: string
          interventions: Json | null
          patient_id: string
          plan_type: string
          provider_id: string
          review_date: string | null
          status: string
          timeline_weeks: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effectiveness_rating?: number | null
          goals?: Json | null
          id?: string
          interventions?: Json | null
          patient_id: string
          plan_type?: string
          provider_id: string
          review_date?: string | null
          status?: string
          timeline_weeks?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effectiveness_rating?: number | null
          goals?: Json | null
          id?: string
          interventions?: Json | null
          patient_id?: string
          plan_type?: string
          provider_id?: string
          review_date?: string | null
          status?: string
          timeline_weeks?: number | null
          updated_at?: string
        }
        Relationships: []
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
      user_activity_patterns: {
        Row: {
          check_in_times: Json | null
          created_at: string
          engagement_score: number | null
          id: string
          last_calculated: string | null
          most_active_hours: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_times?: Json | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          last_calculated?: string | null
          most_active_hours?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_times?: Json | null
          created_at?: string
          engagement_score?: number | null
          id?: string
          last_calculated?: string | null
          most_active_hours?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_analytics: {
        Row: {
          analytics_date: string
          checkin_consistency_score: number | null
          created_at: string
          crisis_risk_score: number | null
          engagement_metrics: Json | null
          id: string
          mood_trend_30day: number | null
          mood_trend_7day: number | null
          pattern_insights: Json | null
          recovery_progress_score: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analytics_date?: string
          checkin_consistency_score?: number | null
          created_at?: string
          crisis_risk_score?: number | null
          engagement_metrics?: Json | null
          id?: string
          mood_trend_30day?: number | null
          mood_trend_7day?: number | null
          pattern_insights?: Json | null
          recovery_progress_score?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analytics_date?: string
          checkin_consistency_score?: number | null
          created_at?: string
          crisis_risk_score?: number | null
          engagement_metrics?: Json | null
          id?: string
          mood_trend_30day?: number | null
          mood_trend_7day?: number | null
          pattern_insights?: Json | null
          recovery_progress_score?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
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
      user_presence: {
        Row: {
          created_at: string
          forum_id: string | null
          id: string
          last_seen: string
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          forum_id?: string | null
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          forum_id?: string | null
          id?: string
          last_seen?: string
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_recovery_plans: {
        Row: {
          clinical_notes: string | null
          completion_percentage: number | null
          created_at: string
          description: string | null
          id: string
          plan_data: Json
          shared_with_partners: Json | null
          shared_with_provider: boolean | null
          start_date: string | null
          status: string
          target_completion_date: string | null
          template_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clinical_notes?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          plan_data?: Json
          shared_with_partners?: Json | null
          shared_with_provider?: boolean | null
          start_date?: string | null
          status?: string
          target_completion_date?: string | null
          template_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clinical_notes?: string | null
          completion_percentage?: number | null
          created_at?: string
          description?: string | null
          id?: string
          plan_data?: Json
          shared_with_partners?: Json | null
          shared_with_provider?: boolean | null
          start_date?: string | null
          status?: string
          target_completion_date?: string | null
          template_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recovery_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "recovery_plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_reputation: {
        Row: {
          comment_karma: number
          created_at: string
          helpful_votes: number
          id: string
          post_karma: number
          total_karma: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_karma?: number
          created_at?: string
          helpful_votes?: number
          id?: string
          post_karma?: number
          total_karma?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_karma?: number
          created_at?: string
          helpful_votes?: number
          id?: string
          post_karma?: number
          total_karma?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string | null
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      approve_provider_registration: {
        Args: { request_id: string; approval_notes?: string }
        Returns: undefined
      }
      calculate_optimal_notification_time: {
        Args: { user_uuid: string }
        Returns: string
      }
      calculate_queue_wait_time: {
        Args: { priority_level: string }
        Returns: number
      }
      calculate_skill_mastery: {
        Args: { user_uuid: string; skill_category_param: string }
        Returns: string
      }
      check_appointment_conflicts: {
        Args: {
          p_provider_id: string
          p_start_time: string
          p_end_time: string
          p_exclude_appointment_id?: string
        }
        Returns: boolean
      }
      check_badge_eligibility: {
        Args: { user_uuid: string; badge_name_param: string }
        Returns: boolean
      }
      check_crisis_alert_rate_limit: {
        Args: { user_uuid: string }
        Returns: boolean
      }
      cleanup_audit_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_support_requests: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_daily_insights: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: undefined
      }
      get_available_slots: {
        Args: {
          p_provider_id: string
          p_date: string
          p_duration_minutes?: number
        }
        Returns: {
          slot_start: string
          slot_end: string
          is_available: boolean
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
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
      get_next_queue_user: {
        Args: { supporter_id: string }
        Returns: string
      }
      get_recovery_streak: {
        Args: { user_uuid: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      log_admin_access: {
        Args: { action_type: string; details?: Json }
        Returns: undefined
      }
      log_export_activity: {
        Args: {
          request_id: string
          activity_action: string
          activity_details?: Json
        }
        Returns: undefined
      }
      log_security_event_enhanced: {
        Args: { event_type: string; event_data?: Json; risk_level?: string }
        Returns: undefined
      }
      log_security_violation: {
        Args: { violation_type: string; details?: Json }
        Returns: undefined
      }
      notify_partner: {
        Args: { partner_id: string; notification_type: string; data: Json }
        Returns: undefined
      }
      search_peer_messages: {
        Args: {
          session_id_param: string
          search_query: string
          user_id_param: string
        }
        Returns: {
          id: string
          message_text: string
          sender_type: string
          created_at: string
          rank: number
        }[]
      }
      validate_security_configuration: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_user_permissions: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      verify_admin_role: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      app_role: "patient" | "provider" | "support_member"
      support_request_type:
        | "connection"
        | "tough_day"
        | "crisis"
        | "check_in"
        | "practice"
        | "wellness_check"
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
      app_role: ["patient", "provider", "support_member"],
      support_request_type: [
        "connection",
        "tough_day",
        "crisis",
        "check_in",
        "practice",
        "wellness_check",
      ],
    },
  },
} as const
