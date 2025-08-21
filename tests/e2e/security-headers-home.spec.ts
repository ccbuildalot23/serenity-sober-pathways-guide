import { test, expect, request } from '@playwright/test';

test('security headers present on home page', async ({ baseURL }) => {
  const ctx = await request.newContext({ baseURL });
  const resp = await ctx.get(`/`);
  expect(resp.status()).toBe(200);
  const headers = resp.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
});


