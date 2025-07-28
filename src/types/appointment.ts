export interface Appointment {
  id: string;
  provider_id: string;
  patient_id: string;
  appointment_type: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'rescheduled';
  start_time: string;
  end_time: string;
  duration_minutes: number;
  title?: string;
  description?: string;
  location_type: 'in_person' | 'telehealth' | 'phone';
  location_details: Record<string, any>;
  
  // Telehealth specific fields
  video_link?: string;
  waiting_room_enabled: boolean;
  pre_appointment_forms: any[];
  
  // Booking details
  booking_notes?: string;
  provider_notes?: string;
  session_notes?: string;
  
  // Fees and policies
  base_fee?: number;
  late_cancellation_fee?: number;
  no_show_fee?: number;
  
  // Recurring appointment settings
  is_recurring: boolean;
  recurrence_pattern?: Record<string, any>;
  parent_appointment_id?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  completed_at?: string;
}

export interface AppointmentSlot {
  slot_start: string;
  slot_end: string;
  is_available: boolean;
}

export interface AppointmentReminder {
  id: string;
  appointment_id: string;
  reminder_type: '24hr' | '2hr' | '30min' | 'custom';
  reminder_method: 'email' | 'sms' | 'push';
  scheduled_for: string;
  sent_at?: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  message_content?: string;
  error_message?: string;
  created_at: string;
}

export interface AppointmentWaitlist {
  id: string;
  provider_id: string;
  patient_id: string;
  preferred_date?: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  appointment_type: string;
  priority_level: number;
  notes?: string;
  status: 'active' | 'notified' | 'booked' | 'expired' | 'cancelled';
  created_at: string;
  expires_at?: string;
  notified_at?: string;
}

export interface CalendarIntegration {
  id: string;
  user_id: string;
  integration_type: 'google' | 'outlook' | 'apple';
  access_token_encrypted?: string;
  refresh_token_encrypted?: string;
  calendar_id?: string;
  sync_enabled: boolean;
  last_sync_at?: string;
  sync_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AppointmentChangeRequest {
  id: string;
  appointment_id: string;
  requested_by: string;
  request_type: 'reschedule' | 'cancel';
  new_start_time?: string;
  new_end_time?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  provider_response?: string;
  created_at: string;
  responded_at?: string;
}

export interface BookingFormData {
  provider_id: string;
  appointment_type: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  location_type: 'in_person' | 'telehealth' | 'phone';
  title?: string;
  description?: string;
  booking_notes?: string;
  is_recurring?: boolean;
  recurrence_pattern?: {
    frequency: 'weekly' | 'biweekly' | 'monthly';
    end_date?: string;
    count?: number;
  };
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  appointment_duration_minutes: number;
  buffer_time_minutes: number;
  max_appointments_per_slot: number;
  appointment_types: string[];
  is_available: boolean;
  effective_date?: string;
  expiry_date?: string;
  created_at: string;
}

export interface TelehealthSession {
  appointment_id: string;
  video_link: string;
  waiting_room_active: boolean;
  participant_status: {
    patient_joined?: boolean;
    provider_joined?: boolean;
    patient_joined_at?: string;
    provider_joined_at?: string;
  };
  session_started_at?: string;
  session_ended_at?: string;
  pre_forms_completed: boolean;
  post_survey_completed: boolean;
}