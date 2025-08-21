### Go/No‑Go Checklist

- CI: Minimal workflow green (Jest unit + Playwright Chromium smoke)
- Portal: Builds without .env; CSV bypass gated to dev
- Security: Headers present (CSP, HSTS, Referrer‑Policy, X‑Frame‑Options, X‑Content‑Type‑Options)
- Smoke: Post‑merge CSV smoke passing on main
- Uptime: Scheduled checks enabled
- Supabase: `pilot_metrics` migration applied; RLS verified
- Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SMOKE_TOKEN, PROD_URL, CI_PROVIDER_ID, SENTRY_DSN configured
- Docs: pilot‑kit, runbook, launch checklist updated
- Release: v0.1.0‑rc1 drafted with `docs/roi-panel-dev.png` attached

Decision:
- ✅ Go when all items are green; otherwise ⚠️ hold and remediate


