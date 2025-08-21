### Launch Checklist

- CI green (Jest + Playwright Chromium smoke)
- Portal builds without .env
- Vercel preview ignored or non‑required on RC branch
- Security headers present (CSP, HSTS, Referrer‑Policy, X‑Frame‑Options, X‑Content‑Type‑Options)
- Supabase migrations applied (including `pilot_metrics`)
- RLS policies verified
- Secrets configured: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SMOKE_TOKEN, PROD_URL, CI_PROVIDER_ID, SENTRY_DSN
- Post‑merge smoke workflow passing
- Uptime checks enabled
- Docs: pilot‑kit, runbook updated
- Go/No‑Go items verified

# Launch Checklist (Pilot)

- [ ] Tests green (Jest + Playwright)
- [ ] Seed works (`pnpm run dev:seed`)
- [ ] ROI screenshot attached at `docs/roi-panel-dev.png`
- [ ] Pilot playbook present (`docs/pilot-playbook.md`)
- [ ] Envs documented (`.env.example`)
- [ ] HIPAA minimum controls doc present (`docs/hipaa-min-controls.md`)
- [ ] Audit event documented and emitted for ROI summary view `{ provider_id, month }`
- [ ] Integration stub documented (`docs/integrations/simplepractice.md`) and interfaces present
 - [ ] Audit export script present (`scripts/export-audit-logs.ts`)
 - [ ] Pricing and pilot demo docs present (`docs/pricing.md`, `docs/pilot-demo-checklist.md`)
 - [ ] Pilot → Paid handoff: 30-day pilot, then Starter tier unless canceled
