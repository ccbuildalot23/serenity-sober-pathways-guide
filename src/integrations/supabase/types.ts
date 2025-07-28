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
          id: string
          message_text: string
          message_type: string | null
          read_at: string | null
          sender_id: string
          sender_type: string
          session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_text: string
          message_type?: string | null
          read_at?: string | null
          sender_id: string
          sender_type: string
          session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_text?: string
          message_type?: string | null
          read_at?: string | null
          sender_id?: string
          sender_type?: string
          session_id?: string
        }
        Relationships: []
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
      peer_support_queue: {
        Row: {
          created_at: string
          estimated_wait_minutes: number | null
          id: string
          issue_description: string | null
          preferred_supporter_id: string | null
          priority: string
          queue_position: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          issue_description?: string | null
          preferred_supporter_id?: string | null
          priority?: string
          queue_position?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_wait_minutes?: number | null
          id?: string
          issue_description?: string | null
          preferred_supporter_id?: string | null
          priority?: string
          queue_position?: number | null
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
      cleanup_old_typing_indicators: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_daily_insights: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: undefined
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
      app_role: "patient" | "provider" | "support_member"
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
    },
  },
} as const
