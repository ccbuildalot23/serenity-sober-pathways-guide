#!/usr/bin/env ts-node
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

type AuditEvent = { time?: string; action: string; actorId?: string; resource?: string; resourceId?: string; phiAccessed?: boolean; meta?: Record<string, unknown> };

function parseArg(name: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : undefined;
}

async function main() {
  const from = parseArg('from');
  const to = parseArg('to');
  if (!from || !to) {
    console.log('Usage: tsx -r dotenv/config scripts/export-audit-logs.ts --from=YYYY-MM-DD --to=YYYY-MM-DD');
    process.exit(0);
  }

  // TODO: Replace with real query to audit log store (e.g., supabase table or log sink)
  console.log(`[audit-export] Exporting audit events from ${from} to ${to}...`);
  const events: AuditEvent[] = [];

  if (!events.length) {
    console.log('[audit-export] No audit store connected; skipping export (ok for pilot).');
    process.exit(0);
  }

  const outDir = path.resolve('exports');
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `audit-logs-${from.replace(/-/g,'')}.csv`;
  const outPath = path.join(outDir, filename);
  const header = 'time,action,actorId,resource,resourceId,phiAccessed';
  const lines = events.map(e => [e.time||'', e.action, e.actorId||'', e.resource||'', e.resourceId||'', String(!!e.phiAccessed)].join(','));
  fs.writeFileSync(outPath, [header, ...lines].join('\n'));
  console.log(`[audit-export] Wrote ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });

