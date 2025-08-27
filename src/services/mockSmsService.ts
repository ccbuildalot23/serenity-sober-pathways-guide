import logger from './loggerService';

interface Contact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

interface SentAlert {
  id: string;
  contactName: string;
  message: string;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'failed';
}

export const sendMockSMS = async (contact: Contact, message: string): Promise<void> => {
  // In production, this would integrate with a real SMS service like Twilio
  logger.debug(`Sending SMS to ${contact.name} (${contact.phone}, { component: 'mockSmsService' });: ${message}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock success response
  return Promise.resolve();
};

export const sendEmergencyAlert = async (contacts: Contact[], message: string, _location?: { lat: number; lng: number }): Promise<void> => {
  logger.debug('Sending emergency alert to contacts:', contacts.map(c => c.name, { component: 'mockSmsService' }););
  logger.debug('Message:', message, { component: 'mockSmsService' });
  
  if (_location) {
    logger.debug('Location:', _location, { component: 'mockSmsService' });
  }
  
  // In production, this would send to all contacts simultaneously
  for (const contact of contacts) {
    await sendMockSMS(contact, message);
  }
};

export const getSentAlerts = async (): Promise<SentAlert[]> => {
  // Mock data for alert history
  const _mockAlerts: SentAlert[] = [
    {
      id: '1',
      contactName: 'John D.',
      message: 'Emergency: Need immediate support',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      status: 'delivered'
    },
    {
      id: '2',
      contactName: 'Sarah M.',
      message: 'Check-in: How are you doing?',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      status: 'sent'
    }
  ];
  
  return Promise.resolve(_mockAlerts);
};
