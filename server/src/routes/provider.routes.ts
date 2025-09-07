import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { providerController } from '../controllers/provider.controller';

const router = Router();

// All routes require authentication and provider role
router.use(authenticate);
router.use(authorize('provider', 'admin'));

// Dashboard routes
router.get('/dashboard', providerController.getDashboard);
router.get('/patients', providerController.getPatients);
router.get('/patients/:id', providerController.getPatientDetails);
router.get('/patients/:id/checkins', providerController.getPatientCheckins);
router.get('/patients/:id/analytics', providerController.getPatientAnalytics);

// ROI and metrics
router.get('/roi', providerController.getROIMetrics);
router.get('/retention', providerController.getRetentionMetrics);
router.get('/billing-opportunities', providerController.getBillingOpportunities);

// Alerts and notifications
router.get('/alerts', providerController.getAlerts);
router.post('/alerts/:id/acknowledge', providerController.acknowledgeAlert);

// Care management
router.post('/patients/:id/care-plan', providerController.createCarePlan);
router.put('/patients/:id/care-plan', providerController.updateCarePlan);
router.post('/patients/:id/notes', providerController.addProgressNote);

// Analytics
router.get('/analytics/overview', providerController.getAnalyticsOverview);
router.get('/analytics/outcomes', providerController.getOutcomeMetrics);
router.get('/analytics/engagement', providerController.getEngagementMetrics);

export default router;