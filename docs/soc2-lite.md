# SOC2-lite (Pilot)

Controls currently met:
1. Secrets management (.env local; no secrets in repo; .env.example committed).
2. Logging and audit events via `AuditService` with structured logs.
3. CI checks (lint, tests) prior to deploy.
4. Change management via PRs and reviews.
5. Least privilege: role checks on API routes.
6. Dependency scanning (periodic).
7. Rate limiting and secure headers.
8. Backups configured at database provider.
9. MFA enforced for admin consoles.
10. Incident response runbook.

Planned post-pilot:
- Formal vendor risk management, access reviews, automated backup restore tests, and centralized SIEM.
