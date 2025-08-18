import { test, expect, request } from '@playwright/test';

test('csv smoke: header & 200', async ({ baseURL }) => {
  const month = new Date().toISOString().slice(0, 7);
  const providerId = process.env.CI_PROVIDER_ID ?? 'demo-provider-0001';
  const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { 'x-smoke-token': process.env.SMOKE_TOKEN ?? '' } });
  const resp = await ctx.get(`/api/billing/providers/${providerId}/summary.csv?month=${month}&smoke=1`);
  expect(resp.status()).toBe(200);
  const firstLine = (await resp.text()).split('\n')[0].trim();
  expect(firstLine).toBe('code,requirement,present,minutes,notes');
});


