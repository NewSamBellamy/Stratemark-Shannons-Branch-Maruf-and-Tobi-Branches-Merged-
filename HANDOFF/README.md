# STRATEMARK launch integration handoff

## Start here

This package is the handoff for the local STRATEMARK integration work completed in the sandbox.

- Repository branch: `launch/integration-ui-cycle`
- HEAD commit: `bccfad7`
- Base feature branches: `origin/Tobi-UI-Design` and `origin/marufs-cycle`
- Product shape: React/Vite web app in `apps/web`, Electron wrapper in `apps/desktop`, shared contracts/research/mocks packages, and Maruf's Sentinel service in `apps/sentinel`.
- Remote push: intentionally not performed yet.

## Fastest way to work locally

Requirements: Node 20 or newer and pnpm 10.34.3.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:5173`.

Useful checks:

```bash
pnpm check
pnpm build
pnpm --filter @mi/web test:e2e
pnpm --filter @mi/desktop build:main
```

The current validation state is documented in `docs/AUDIT_STATUS.md`.

## Browser staging artifact

`artifacts/stratemark-web-staging-v14.html` is the current self-contained single-file web build. It is useful for a quick visual review without installing Electron, but live Firebase, Google research, Paddle, cloud persistence, Sentinel, and server cron require environment configuration.

## Key routes

- `/` — New Deck
- `/history` — Deck History
- `/markets/:marketId/deck` — Deck and card taxonomy
- `/markets/:marketId/settings` — Deck refresh cadence
- `/research/:taskId` — Deck loading/research task
- `/company/:companyId/dashboard/overview` — Company dashboard
- `/reports` — Reports
- `/settings` — API key, subscription, import/export

## Git bundle

`STRATEMARK-launch-integration.bundle` contains the local Git history and refs. To create a working clone from it:

```bash
git clone STRATEMARK-launch-integration.bundle STRATEMARK
cd STRATEMARK
git switch launch/integration-ui-cycle
```

If the bundle is moved outside the handoff directory, replace the bundle path in the clone command.

## Important security note

Do not commit API keys, Firebase secrets, Paddle credentials, or service-account files. Enter a Google AI Studio key through the app's Settings screen or configure deployment secrets through the target hosting platform.
