---
title: Migrate dev stack to ESLint 9, Tailwind 4, Vite 7, plugin-react-swc 4
status: proposed
date: 2025-08-08
---

## Context

Dependabot PR #78 attempted to bump major dev dependencies, causing CI failures (lint/build/E2E). We will migrate in a dedicated branch.

## Decision

- Create branch `chore/deps-migration`.
- Upgrade ESLint to 9 with flat config, update plugins.
- Upgrade Tailwind to 4 with new config and tooling.
- Upgrade Vite to 7 and `@vitejs/plugin-react-swc` 4; ensure Node 20.
- Fix configs and scripts to restore green CI/Playwright.

## Steps

1. Convert ESLint to flat config (`eslint.config.js`) and update rules.
2. Tailwind 4: new `tailwind.config.ts`, update PostCSS, fix classes if needed.
3. Vite 7: update `vite.config.ts`, regenerate lockfile, fix ESM config.
4. Run CI locally and push; iterate until all checks pass.

## Consequences

- Modern tooling, reduced diff noise, faster builds.
- Temporary branch to isolate risk.


