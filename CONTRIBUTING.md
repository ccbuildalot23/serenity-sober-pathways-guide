# Contributing

## Commit messages

- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Enforced by commitlint via Husky `commit-msg` hook

## Pull requests

- Provide a clear summary and link related issues/ADRs
- Ensure Playwright tests pass locally (`npx playwright test`)
- CI uploads Playwright reports as artifacts on each run

## Branching

- Create feature branches from `main`
- Keep PRs small and focused

## Secrets/PHI

- Never commit secrets or PHI; `.env*` files are ignored
