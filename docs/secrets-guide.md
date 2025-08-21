### Secrets Guide

Configure these in both GitHub Actions (Repository secrets) and Vercel (Environment Variables):

- SUPABASE_URL: https://<project>.supabase.co
- SUPABASE_ANON_KEY: Public anon key
- SUPABASE_SERVICE_ROLE_KEY: Service role key (server only)
- SMOKE_TOKEN: Random string for CSV smoke bypass in dev
- PROD_URL: Production URL (e.g., https://serenity.app)
- CI_PROVIDER_ID: Demo provider ID used by smoke (e.g., demo-provider-0001)
- SENTRY_DSN: Optional Sentry DSN for error reporting

Notes:
- Portal CI checkout uses a token via `PORTAL_REPO_TOKEN` (set as GitHub secret)
- Vercel previews are ignored for `fix/seed-and-tests` via `vercel.json` `ignoreCommand`


