import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware';
import { checkinController } from '../controllers/checkin.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation
const checkinValidation = [
  body('moodScore').isInt({ min: 1, max: 10 }),
  body('anxietyLevel').isInt({ min: 1, max: 10 }),
  body('sleepQuality').isInt({ min: 1, max: 10 }),
  body('notes').optional().isString().trim(),
];

// Routes
router.post('/', checkinValidation, checkinController.create);
router.get('/', checkinController.getUserCheckins);
router.get('/stats', checkinController.getStats);
router.get('/:id', checkinController.getById);
router.put('/:id', checkinValidation, checkinController.update);
router.delete('/:id', checkinController.delete);

export default router;