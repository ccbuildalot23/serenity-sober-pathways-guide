import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoiBillingPanel } from '../../serenity-provider-portal/src/components/provider/RoiBillingPanel';

beforeAll(() => {
	(global as any).fetch = jest.fn(async (url: string) => {
		if (url.includes('/api/billing/providers/')) {
			return {
				ok: true,
				json: async () => ({ minutesCCM: 45, minutesBHI: 25, retainedPatientsEstimate: 3, suggestedCodes: [ { code: '99490', reason: 'test', minutes: 20, confidence: 0.9, missing: [] } ] })
			} as any;
		}
		return { ok: false, json: async () => ({}) } as any;
	});
});

describe('RoiBillingPanel', () => {
	it('renders tiles and chips when enabled', async () => {
		render(<RoiBillingPanel providerId="prov-1" month="2025-01" enabled={true} />);
		expect(await screen.findByRole('heading', { name: /ROI & Billing Hints/i })).toBeInTheDocument();
		expect(await screen.findByLabelText('Estimated ROI')).toBeInTheDocument();
		expect(await screen.findByLabelText('Time Captured')).toBeInTheDocument();
		expect(await screen.findByLabelText('Suggested Codes')).toBeInTheDocument();
	});
	it('hides when disabled', () => {
		render(<RoiBillingPanel providerId="prov-1" month="2025-01" enabled={false} />);
		expect(screen.queryByRole('heading', { name: /ROI & Billing Hints/i })).not.toBeInTheDocument();
	});
});
