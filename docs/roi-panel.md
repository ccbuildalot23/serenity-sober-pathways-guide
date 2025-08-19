# ROI Panel Formulae and Demo Script

## Formulae
- Estimated ROI = retainedPatientsEstimate × roiRate.
- Inputs:
  - retention delta: projected number of patients retained due to navigation.
  - minutes captured: CCM minutes, BHI minutes (rolled up from events).
  - code suggestions: heuristic mapping to 99490/99439 (CCM) and 99484 (BHI).
- Defaults: roiRate = $4,500/year per retained SUD patient.

## Data sources
- `interaction_events` table for CCM/BHI minutes.
- `BillingHintsService.getMonthlySummary` for summary and suggested codes.
- Audit logs via `AuditService.log('billing_summary_view', { provider_id, month })`.

## 60-second demo script
1. Open provider dashboard.
2. Ensure month is current; panel loads summary.
3. Hover the ROI value to view tooltip with inputs.
4. Expand Suggested Codes to view rationale and missing checklist.
5. Confirm audit event and metric logged in server logs.

