import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Placeholder for billing routes
router.use(authenticate);
router.use(authorize('provider', 'admin'));

router.get('/codes', (req, res) => {
  res.json({ message: 'Billing codes endpoint' });
});

export default router;