import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Placeholder for messaging routes
router.use(authenticate);

router.get('/conversations', (req, res) => {
  res.json({ message: 'Messaging endpoint' });
});

export default router;