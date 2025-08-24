
export interface Clinician {
  id: string;
  name: string;
  title: string;
  specialties: string[];
  location: {
    state: string;
    city?: string;
    isRemote: boolean;
  };
  contact: {
    website?: string;
    email?: string;
    phone?: string;
    bookingUrl?: string;
  };
  credentials: string[];
  yearsExperience?: number;
  languages?: string[];
  insuranceAccepted?: string[];
  bio?: string;
  photoUrl?: string;
  tags?: ('telehealth' | 'in-person' | 'sliding-scale' | 'trauma-informed' | 'lgbtq-friendly')[];
}
