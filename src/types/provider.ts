export interface Provider {
  id: string;
  user_id?: string;
  name: string;
  title: string;
  specialties: string[];
  credentials: string[];
  bio?: string;
  photo_url?: string;
  years_experience?: number;
  languages: string[];
  
  // Location
  location_state: string;
  location_city?: string;
  location_address?: string;
  is_remote: boolean;
  
  // Contact
  website_url?: string;
  phone_number?: string;
  email?: string;
  booking_url?: string;
  
  // Professional
  license_number?: string;
  license_state?: string;
  npi_number?: string;
  
  // Practice
  practice_name?: string;
  insurance_accepted: string[];
  accepted_payment_methods: string[];
  sliding_scale_available: boolean;
  
  // Availability
  availability_schedule: Record<string, any>;
  max_patients: number;
  current_patient_count: number;
  accepting_new_patients: boolean;
  
  // Features
  tags: string[];
  
  // Verification
  is_verified: boolean;
  verification_date?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  
  // Ratings
  average_rating: number;
  total_reviews: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface ProviderReview {
  id: string;
  provider_id: string;
  reviewer_id: string;
  rating: number;
  review_text?: string;
  is_anonymous: boolean;
  is_verified_patient: boolean;
  is_approved: boolean;
  created_at: string;
}

export interface ProviderConnectionRequest {
  id: string;
  patient_id: string;
  provider_id: string;
  request_message?: string;
  provider_response?: string;
  status: 'pending' | 'approved' | 'declined' | 'cancelled';
  share_daily_checkins: boolean;
  share_mood_data: boolean;
  share_goal_progress: boolean;
  share_crisis_events: boolean;
  requested_at: string;
  responded_at?: string;
}

export interface SavedProvider {
  id: string;
  user_id: string;
  provider_id: string;
  notes?: string;
  created_at: string;
}

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
  appointment_duration_minutes: number;
}

export interface ProviderInvitation {
  id: string;
  provider_id: string;
  invited_by: string;
  patient_email: string;
  patient_name?: string;
  invitation_message?: string;
  status: 'sent' | 'accepted' | 'declined' | 'expired';
  expires_at: string;
  created_at: string;
  responded_at?: string;
}

export interface ProviderSearchFilters {
  searchTerm: string;
  state: string;
  specialty: string;
  insurance: string;
  tags: string[];
  acceptingNewPatients: boolean;
  sortBy: 'distance' | 'rating' | 'experience' | 'name';
  sortOrder: 'asc' | 'desc';
}