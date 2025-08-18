# HIPAA Minimum Controls (Pilot)

- Access control model: three-user architecture (patient, provider, practice admin).
- PHI data map: profiles, interaction_events, minimal PHI in audit metadata only.
- Audit logging: `AuditService` emits events; stored with WORM retention in prod.
- Encryption: at rest via Supabase Postgres; in transit via TLS.
- Backups/retention: daily snapshots; 30-day retention.
- Breach response contacts: security@serenity.example; on-call pager.
- BAA checklist: Supabase and Vercel BAAs executed for pilot.
- Scope for pilot: ROI panel, billing hints, audit logs; no unrelated PHI surfaces.
