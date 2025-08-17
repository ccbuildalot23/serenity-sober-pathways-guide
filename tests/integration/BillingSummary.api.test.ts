import request from 'supertest';
import express from 'express';
import { billingRouter } from '../../serenity-provider-portal/src/server/routes/billing';

const app = express();
app.use(express.json());
app.use('/api/billing', (req, _res, next) => { (req as any).user = { id: 'u1', roles: ['provider'] }; next(); }, billingRouter);

describe('GET /api/billing/providers/:id/summary', () => {
	it('returns 200 with summary', async () => {
		const res = await request(app).get('/api/billing/providers/prov-1/summary?month=2025-01');
		expect(res.status).toBe(200);
		expect(res.body).toHaveProperty('minutesCCM');
	});
	it('returns 403 for non-provider', async () => {
		const noRole = express();
		noRole.use(express.json());
		noRole.use('/api/billing', (req, _res, next) => { (req as any).user = { id: 'u2', roles: ['viewer'] }; next(); }, billingRouter);
		const res = await request(noRole).get('/api/billing/providers/prov-1/summary?month=2025-01');
		expect(res.status).toBe(403);
	});
});

