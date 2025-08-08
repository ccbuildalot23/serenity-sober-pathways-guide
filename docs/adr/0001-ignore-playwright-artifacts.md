---
title: Ignore Playwright test artifacts and upload via CI
status: accepted
date: 2025-08-08
---

## Context

Running Playwright creates large binary artifacts (`playwright-report/`, `test-results/`) that clutter the repository and cause noisy diffs. We need clear test evidence without committing ephemeral files.

## Decision

- Add ignore rules for `playwright-report/`, `test-results/`, `TEST_RESULTS_SUMMARY.md`, and `test-results.xml`.
- Configure a GitHub Actions workflow to run Playwright on pushes/PRs and upload artifacts for each run.
- Add `.editorconfig` and `.gitattributes` to normalize formatting and line endings across contributors.

## Consequences

- The repo stays clean; reports are attached to builds as downloadable artifacts.
- Contributors get consistent line endings (LF) and fewer diffs due to EOL changes.
- To review a report locally, run `npx playwright test` then open `playwright-report/index.html`.

## Related Changes

- `.gitignore` updated to exclude Playwright outputs.
- `.github/workflows/playwright.yml` added.
- `.editorconfig` and `.gitattributes` added.


