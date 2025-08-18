#!/usr/bin/env ts-node
import 'dotenv/config';

async function main() {
  const providerId = process.env.PROVIDER_ID || 'demo-provider-0001';
  const now = new Date();
  const month = process.env.SMOKE_MONTH || `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}`;
  const port = Number(process.env.VITE_PORT || '5174');
  const url = `http://localhost:${port}/api/billing/providers/${providerId}/summary.csv?month=${month}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`[smoke-csv] Non-200: ${res.status}`);
    process.exit(1);
  }
  const text = await res.text();
  const first = text.split('\n')[0]?.trim();
  if (first === 'code,requirement,present,minutes,notes') {
    console.log('[smoke-csv] OK:', first);
    process.exit(0);
  }
  console.error('[smoke-csv] Unexpected header:', first);
  process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });

