
import type { Clinician } from '@/types/clinician';

export const sampleClinicians: Clinician[] = [
  {
    id: "1",
    name: "Dr. Sarah Mitchell",
    title: "Licensed Clinical Psychologist",
    specialties: ["Addiction Recovery", "Trauma-Informed Care", "PTSD"],
    location: {
      state: "California",
      city: "Los Angeles",
      isRemote: true
    },
    contact: {
      website: "https://drmitchelltherapy.com",
      email: "info@drmitchelltherapy.com",
      bookingUrl: "https://calendly.com/drmitchell"
    },
    credentials: ["PhD", "CADC-II"],
    yearsExperience: 15,
    languages: ["English", "Spanish"],
    insuranceAccepted: ["Aetna", "Blue Cross", "Cigna"],
    bio: "Specializing in dual diagnosis and trauma-informed addiction recovery with over 15 years of experience.",
    photoUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200",
    tags: ["telehealth", "trauma-informed", "sliding-scale"]
  },
  {
    id: "2",
    name: "Michael Chen, LMFT",
    title: "Marriage & Family Therapist",
    specialties: ["Substance Abuse", "Family Systems", "Codependency"],
    location: {
      state: "New York",
      city: "Brooklyn",
      isRemote: false
    },
    contact: {
      website: "https://chentherapynyc.com",
      phone: "(555) 123-4567"
    },
    credentials: ["LMFT", "CASAC"],
    yearsExperience: 8,
    languages: ["English", "Mandarin"],
    insuranceAccepted: ["United Healthcare", "Oscar", "Anthem"],
    bio: "Supporting individuals and families through addiction recovery using evidence-based approaches.",
    tags: ["in-person", "lgbtq-friendly"]
  },
  {
    id: "3",
    name: "Dr. James Wilson",
    title: "Psychiatrist & Addiction Specialist",
    specialties: ["Dual Diagnosis", "Medication Management", "Opioid Recovery"],
    location: {
      state: "Texas",
      city: "Austin",
      isRemote: true
    },
    contact: {
      email: "contact@wilsonpsych.com",
      bookingUrl: "https://wilsonpsych.com/book"
    },
    credentials: ["MD", "ABAM"],
    yearsExperience: 20,
    languages: ["English"],
    insuranceAccepted: ["Most major insurances accepted"],
    bio: "Board-certified psychiatrist specializing in medication-assisted treatment and dual diagnosis.",
    photoUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200",
    tags: ["telehealth", "in-person"]
  },
  {
    id: "4",
    name: "Rebecca Torres, LCSW",
    title: "Clinical Social Worker",
    specialties: ["Women's Recovery", "Trauma", "Eating Disorders"],
    location: {
      state: "Florida",
      city: "Miami",
      isRemote: true
    },
    contact: {
      website: "https://torreshealing.com",
      email: "rebecca@torreshealing.com"
    },
    credentials: ["LCSW", "CCTP"],
    yearsExperience: 12,
    languages: ["English", "Spanish", "Portuguese"],
    insuranceAccepted: ["Self-pay", "Sliding scale available"],
    bio: "Compassionate support for women in recovery, specializing in trauma and co-occurring disorders.",
    photoUrl: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200",
    tags: ["telehealth", "sliding-scale", "trauma-informed", "lgbtq-friendly"]
  },
  {
    id: "5",
    name: "Dr. Marcus Thompson",
    title: "Addiction Medicine Specialist",
    specialties: ["Alcohol Recovery", "Medication-Assisted Treatment", "Chronic Pain & Addiction"],
    location: {
      state: "Washington",
      city: "Seattle",
      isRemote: true
    },
    contact: {
      website: "https://thompsonrecovery.com",
      bookingUrl: "https://thompsonrecovery.com/appointments"
    },
    credentials: ["MD", "FASAM"],
    yearsExperience: 18,
    languages: ["English"],
    insuranceAccepted: ["Medicare", "Medicaid", "Private Insurance"],
    bio: "Evidence-based treatment combining medication management with compassionate care for lasting recovery.",
    photoUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200",
    tags: ["telehealth", "in-person", "trauma-informed"]
  }
];
