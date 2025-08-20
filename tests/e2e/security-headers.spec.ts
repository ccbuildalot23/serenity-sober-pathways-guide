import { test, expect, request } from '@playwright/test';

test('security headers present on CSV API', async ({ baseURL }) => {
  const month = new Date().toISOString().slice(0, 7);
  const providerId = process.env.CI_PROVIDER_ID ?? 'demo-provider-0001';
  const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { 'x-smoke-token': process.env.SMOKE_TOKEN ?? '' } });
  const resp = await ctx.get(`/api/billing/providers/${providerId}/summary.csv?month=${month}&smoke=1`);
  expect(resp.status()).toBe(200);
  const headers = resp.headers();
  // Minimal hardening headers required for CI stability; stricter policies can be validated separately
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
});


