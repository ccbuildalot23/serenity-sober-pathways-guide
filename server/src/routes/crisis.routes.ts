import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { crisisController } from '../controllers/crisis.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation
const alertValidation = [
  body('severity').isIn(['low', 'medium', 'high', 'critical']),
  body('message').optional().isString(),
  body('location').optional().isObject(),
];

const contactValidation = [
  body('name').notEmpty().trim(),
  body('phone').notEmpty().matches(/^[\d\s\-\+\(\)]+$/),
  body('relationship').optional().trim(),
  body('isPrimary').optional().isBoolean(),
];

// Crisis alert routes
router.post('/alert', alertValidation, crisisController.triggerAlert);
router.get('/alerts', crisisController.getUserAlerts);
router.get('/alerts/:id', crisisController.getAlertById);
router.post('/alerts/:id/resolve', crisisController.resolveAlert);

// Emergency contacts routes
router.get('/contacts', crisisController.getEmergencyContacts);
router.post('/contacts', contactValidation, crisisController.addEmergencyContact);
router.put('/contacts/:id', contactValidation, crisisController.updateEmergencyContact);
router.delete('/contacts/:id', crisisController.deleteEmergencyContact);

// Crisis plan routes
router.get('/plan', crisisController.getCrisisPlan);
router.put('/plan', crisisController.updateCrisisPlan);

// Resources
router.get('/resources', crisisController.getCrisisResources);

export default router;