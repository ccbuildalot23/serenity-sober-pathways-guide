Portal PR #1 (feat/provider-roi-billing-panel)

Changes:
- ROI & Billing panel implemented; CSV download triggers metric
- CSV smoke bypass guarded to dev-only; lazy imports inside guard
- Dev server headers aligned; optional Sentry wiring available in server

Build:
- Portal builds without .env

Notes:
- CSV endpoint: `/api/billing/providers/:id/summary.csv?month=YYYY-MM` (dev smoke via `smoke=1` + `x-smoke-token`)

Next:
- Ensure secrets in Vercel; confirm Supabase credentials and service role keys

