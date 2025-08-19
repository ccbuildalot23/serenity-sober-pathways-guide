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
