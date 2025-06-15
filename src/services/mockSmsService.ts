
interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export const sendMockSMS = async (contact: Contact, message: string): Promise<void> => {
  // In production, this would integrate with a real SMS service like Twilio
  console.log(`Sending SMS to ${contact.name} (${contact.phone}): ${message}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock success response
  return Promise.resolve();
};

export const sendEmergencyAlert = async (contacts: Contact[], message: string, location?: { lat: number; lng: number }): Promise<void> => {
  console.log('Sending emergency alert to contacts:', contacts.map(c => c.name));
  console.log('Message:', message);
  
  if (location) {
    console.log('Location:', location);
  }
  
  // In production, this would send to all contacts simultaneously
  for (const contact of contacts) {
    await sendMockSMS(contact, message);
  }
};
