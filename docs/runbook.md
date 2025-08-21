### Release Runbook

#### Deploy
- Merge to `main` triggers CI (Jest + Chromium Playwright smoke)
- Vercel previews are ignored for `fix/seed-and-tests` via `vercel.json` ignoreCommand
- Production deploy via Vercel dashboard once main is green

#### Feature Flags
- CSV smoke bypass: dev‑only via `NODE_ENV !== 'production'` and `x-smoke-token`
- Metrics: set `METRICS_ENABLED=1` to enable lightweight client metrics

#### Rollback
- Use Vercel “Rollback” to previous deployment
- Re-run `post-merge-smoke.yml` manually to verify CSV endpoint recovers

#### Smoke
- GitHub Action `post-merge-smoke.yml` hits `${PROD_URL}/api/billing/providers/${CI_PROVIDER_ID}/summary.csv?month=YYYY-MM&smoke=1`
- Requires header `x-smoke-token: $SMOKE_TOKEN`
- Locally: `pnpm smoke:csv`

#### Monitoring
- `uptime.yml` pings homepage and CSV endpoint every 10 minutes
- Configure Sentry DSN via secret `SENTRY_DSN` (optional)

#### Secrets
- Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SMOKE_TOKEN`, `PROD_URL`, `CI_PROVIDER_ID`
- Optional: `SENTRY_DSN`
- Set in GitHub (Actions secrets) and Vercel (Environment Variables)


