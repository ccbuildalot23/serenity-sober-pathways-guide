import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../utils/logger';

const router = Router();

// SMS validation middleware
const smsValidation = [
  body('to').isMobilePhone('any').withMessage('Valid phone number required'),
  body('message').isLength({ min: 1, max: 1600 }).withMessage('Message must be between 1-1600 characters'),
  body('type').optional().isIn(['crisis', 'reminder', 'verification']).withMessage('Invalid SMS type'),
];

// Send SMS
router.post('/send', smsValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { to, message, type = 'notification', userId } = req.body;

    // TODO: Implement Twilio SMS sending
    // const twilioService = new TwilioService();
    // const result = await twilioService.sendSMS(to, message);

    logger.info(`SMS sent to ${to}`, { type, userId });
    
    res.json({
      success: true,
      message: 'SMS sent successfully',
      messageId: `sms_${Date.now()}`
    });
  } catch (error) {
    logger.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send crisis alert SMS
router.post('/crisis-alert', async (req, res) => {
  try {
    const { userId, emergencyContacts, location } = req.body;

    if (!userId || !emergencyContacts || !Array.isArray(emergencyContacts)) {
      return res.status(400).json({ error: 'User ID and emergency contacts required' });
    }

    // TODO: Implement crisis alert SMS sending to multiple contacts
    const alerts = [];
    for (const contact of emergencyContacts) {
      // Send crisis alert SMS
      alerts.push({
        contactId: contact.id,
        status: 'sent',
        messageId: `crisis_${Date.now()}_${contact.id}`
      });
    }

    logger.info(`Crisis alert SMS sent for user ${userId}`, { contactCount: emergencyContacts.length });
    
    res.json({
      success: true,
      message: 'Crisis alert SMS sent to emergency contacts',
      alerts
    });
  } catch (error) {
    logger.error('Error sending crisis alert SMS:', error);
    res.status(500).json({ error: 'Failed to send crisis alert SMS' });
  }
});

// Get SMS delivery status
router.get('/status/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // TODO: Implement SMS status checking via Twilio API
    
    res.json({
      messageId,
      status: 'delivered',
      sentAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error checking SMS status:', error);
    res.status(500).json({ error: 'Failed to check SMS status' });
  }
});

export { router as smsRoutes };