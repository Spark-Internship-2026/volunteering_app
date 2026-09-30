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

## Deploying (Cloudflare Workers)

The app deploys to Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare). Config lives in `wrangler.jsonc` and `open-next.config.ts`.

```bash
npm run preview:cf   # build and run the Worker locally (workerd) on http://localhost:8787
npm run deploy:cf    # build and deploy to production (needs `npx wrangler login`)
npm run upload:cf    # build and upload a new version without promoting it
```

`NEXT_PUBLIC_FIREBASE_*` values are inlined at **build** time, so set them as build variables in Cloudflare (not only as runtime vars).

`next.config.ts` aliases `@firebase/firestore` to its browser build. Workers block `eval`, which the Node build of Firestore needs. Don't remove it.

### PR preview URLs (GitHub Actions)

- `.github/workflows/preview.yml` builds every same-repo PR, uploads a Worker **version** (never touches production) and comments a stable URL like `https://pr-<number>-volunteering-app.spark-internship-2026.workers.dev`.
- `.github/workflows/deploy.yml` deploys `main` to production.
- Firebase web config and the Cloudflare account id are GitHub repo **variables**. The one **secret** is `CLOUDFLARE_API_TOKEN` (Cloudflare dashboard > My Profile > API Tokens > "Edit Cloudflare Workers" template, scoped to this account). Set it with `gh secret set CLOUDFLARE_API_TOKEN --repo Spark-PNW/volunteering_app`.
- Anyone with write access can read secrets through a workflow, so keep the token scoped to Workers only.
- Add preview domains to Firebase Console > Authentication > Settings > Authorized domains if verification/reset emails misbehave on previews.
