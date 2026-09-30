This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Local development

Prereqs: Node 20+, Java 21+ (`brew install openjdk`, then add `/opt/homebrew/opt/openjdk/bin` to your PATH).

```bash
npm install
npm run dev:local   # Firebase Auth + Firestore emulators + Next.js on http://localhost:3000
```

This runs fully offline against local emulators, so no real Firebase keys are needed and nobody's testing touches shared data. The emulator UI is at http://localhost:4000. Data persists in `.emulator-data/` (gitignored).

- Sample data: with `dev:local` running, `npm run seed:emulator` creates seeded users and events. Logins: `staff-auth@`, `staff-student@`, `staff-events@`, `staff-staff@`, `student1@`..`student3@example.com`, password `localdev123`.
- Cloud test project: only the four staff accounts are seeded (`npm run seed:staff`). Students sign up normally.
- Make any other user staff: sign up in the app, then `npm run make-staff -- you@example.com`.
- Run against the real Firebase project instead: copy `.env.example` to `.env.local`, fill in the values, and use `npm run dev`.
- Firestore rules tests: `npm run rules:test`.

### Rules: strict vs. open

- `firestore.rules` is the strict, production-ready rules file.
- `firestore.dev.rules` is wide open for signed-in users. The emulator (`dev:local`) uses it, and `npm run rules:deploy:dev` deploys it to the cloud project while it holds only test data.
- **Before launch:** run `npm run rules:deploy` to redeploy the strict rules and clear test data. Every PR must list its Firestore changes (see the PR template) so strict rules can be written for them.
- `npm run emulators:strict` runs the emulators with the strict rules.

## Environments and deploys

| | Firebase project | Worker | How it deploys |
|---|---|---|---|
| Local | emulators (`npm run dev:local`) | none | your laptop |
| PR preview | staging (`volunteering-39547`, open rules, test data) | `volunteering-app-staging`, alias `pr-<n>` | automatically per PR (`preview.yml`) |
| Staging | staging (same project) | `volunteering-app-staging` | automatically on every merge to `main` (`deploy-staging.yml`) |
| Production | `spark-volunteering-prod` (strict rules, real data) | `volunteering-app` | manually: Actions > "Deploy production" > Run workflow. Needs approval from a `production` environment reviewer. |

- Staging URL: https://volunteering-app-staging.spark-internship-2026.workers.dev
- Production URL: https://volunteering-app.spark-internship-2026.workers.dev
- PR previews look like `https://pr-<n>-volunteering-app-staging.spark-internship-2026.workers.dev`.
- Firebase web config lives in GitHub **environment** variables (`staging`, `production`); `CLOUDFLARE_API_TOKEN` is a repo secret. `NEXT_PUBLIC_FIREBASE_*` values are inlined at build time.
- `main` is protected: CI (`check`) must pass, one approval is required, and the branch must be **up to date with `main`** before merging (use "Update branch").
- Rollback: run "Deploy production" again with `ref` set to a previous commit or tag.

### Rules deploys are separate (not part of the app deploy)
- Production (strict): `npm run rules:deploy`. Run it whenever `firestore.rules` changes, **before** promoting code that needs the change.
- Staging (open): `npm run rules:deploy:dev`.
- `npm run reset:cloud` wipes the **staging** database only.

### Local Cloudflare preview
`npm run preview:cf` builds and runs the Worker locally on http://localhost:8787.

`next.config.ts` aliases `@firebase/firestore` to its browser build. Workers block `eval`, which the Node build of Firestore needs. Don't remove it.

### Cloudflare token
`CLOUDFLARE_API_TOKEN` (Cloudflare dashboard > My Profile > API Tokens > "Edit Cloudflare Workers" template, scoped to this account). Anyone with write access can read secrets through a workflow, so keep it scoped to Workers only.
