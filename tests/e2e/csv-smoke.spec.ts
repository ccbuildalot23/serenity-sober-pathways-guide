import { test, expect, request } from '@playwright/test';

test('csv smoke: header & 200', async ({ baseURL }) => {
  const month = new Date().toISOString().slice(0, 7);
  const providerId = 'demo-provider-0001';
  const ctx = await request.newContext({ baseURL });
  const resp = await ctx.get(`/api/billing/providers/${providerId}/summary.csv?month=${month}`);
  expect(resp.status()).toBe(200);
  const firstLine = (await resp.text()).split('\n')[0].trim();
  expect(firstLine).toBe('code,requirement,present,minutes,notes');
});


