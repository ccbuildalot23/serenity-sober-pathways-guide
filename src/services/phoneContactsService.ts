
interface PhoneEmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  isEmergencyContact: boolean;
}

// Mock phone emergency contacts
const mockPhoneContacts: PhoneEmergencyContact[] = [
  {
    id: 'phone-1',
    name: 'Emergency Contact - John',
    phone: '911-555-0001',
    relationship: 'Emergency Contact',
    isEmergencyContact: true
  },
  {
    id: 'phone-2', 
    name: 'ICE - Sarah Smith',
    phone: '911-555-0002',
    relationship: 'ICE Contact',
    isEmergencyContact: true
  }
];

export const getPhoneEmergencyContacts = async (): Promise<PhoneEmergencyContact[]> => {
  // Simulate API call delay
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Mock: Fetching phone emergency contacts');
      resolve(mockPhoneContacts);
    }, 1000);
  });
};

export const hasPhoneContactsAccess = (): boolean => {
  // Mock check for phone contacts API access
  return Math.random() > 0.3; // 70% chance of having access
};
