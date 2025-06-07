
export interface SentAlert {
  id: string;
  contactName: string;
  contactPhone: string;
  message: string;
  location?: string;
  timestamp: Date;
  status: 'success' | 'failure';
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export const sendMockSMS = async (
  contact: Contact, 
  message: string, 
  location?: string
): Promise<{ success: boolean; error?: string }> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
  
  // Simulate 90% success rate
  const success = Math.random() > 0.1;
  
  const alert: SentAlert = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    contactName: contact.name,
    contactPhone: contact.phone,
    message,
    location,
    timestamp: new Date(),
    status: success ? 'success' : 'failure'
  };
  
  // Store to localStorage
  const existingAlerts = getSentAlerts();
  const updatedAlerts = [alert, ...existingAlerts];
  localStorage.setItem('sentAlerts', JSON.stringify(updatedAlerts));
  
  if (success) {
    console.log(`SMS sent successfully to ${contact.name} (${contact.phone})`);
    return { success: true };
  } else {
    console.log(`Failed to send SMS to ${contact.name} (${contact.phone})`);
    return { success: false, error: 'Network error occurred' };
  }
};

export const getSentAlerts = (): SentAlert[] => {
  const stored = localStorage.getItem('sentAlerts');
  if (!stored) return [];
  
  try {
    const alerts = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return alerts.map((alert: any) => ({
      ...alert,
      timestamp: new Date(alert.timestamp)
    }));
  } catch (error) {
    console.error('Error parsing sent alerts:', error);
    return [];
  }
};

export const clearSentAlerts = (): void => {
  localStorage.removeItem('sentAlerts');
};
