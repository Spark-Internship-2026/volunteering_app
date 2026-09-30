<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-guardrails -->

# Rules for AI coding assistants in this repo

This project is worked on by ~15 newcomers at once, often with an AI assistant. These rules keep a mistake from costing everyone their work. **If a task seems to need something forbidden here, stop and ask the human instead of working around it.**

## Work only against the local emulators
- Develop and test with `npm run dev:local` (open rules) or `npm run dev:restricted` (the same rules as staging and production). Seed sample data with `npm run seed:emulator`.
- Do **not** point `.env.local` at the staging or production Firebase project for routine work, and never use the production config. Shared staging has one small free quota that all 15 people share.
- Test data: prefix names with your team (`[Events] Test event`). Never delete or overwrite other people's data.

## Never run these (only the maintainer does)
- Anything that deploys or changes cloud state: `firebase deploy`, `npm run rules:deploy*`, `npm run reset:cloud`, `npm run seed` or `npm run seed:staff` (cloud), `wrangler deploy` / `wrangler versions upload` / `wrangler secret`, `npm run deploy:cf`, `npm run upload:cf`, `gh workflow run`.
- Anything that logs in to a cloud account: `firebase login`, `wrangler login`.
- Git actions that can lose or bypass others' work: `git push --force`, pushing to `main`, `gh pr merge`, `git reset --hard` (unless asked), deleting branches you did not create.
- Do not change repository settings, secrets or variables (`gh secret ...`, `gh variable ...`, `gh api ...`).

## Do not edit without an explicit instruction from a human
`firestore.rules`, `firestore.restricted.rules`, `firestore.dev.rules`, `firebase*.json`, `.firebaserc`, `wrangler.jsonc`, `open-next.config.ts`, everything in `.github/`, `.claude/`, this file. These control security and deployment; changes need the code owner's review.

## "Permission denied" from Firestore
- **Never loosen the rules to make an error go away.** Reproduce it with `npm run dev:restricted` and read the emulator log: it names the rule that refused.
- Usual fixes are in the code, not the rules: use a batch for the capacity counter, put new data in a new top-level collection (not a subcollection under `users`, `opportunities`, `signups` or `eventTemplates`), keep students' signup writes to the core fields.
- If the rules really need to change, say so in the PR's "Firestore changes" section and leave it to the code owner.

## Keep Firebase usage low (quota is shared)
A runaway loop can burn the whole project's free daily reads and block every teammate's preview.
- Every `onSnapshot` needs its unsubscribe returned from the `useEffect` cleanup. Effects must have stable dependencies: never put an object, array or function created during render in a dependency list.
- Never read in a loop, on a timer or on every keystroke. Don't read whole collections in render paths; add `limit()` to new lists and filter in the query.
- Don't start a listener and a one-off read for the same data.
- Before opening a PR, load each page you changed once on the emulator and watch for repeated requests.

## Secrets
- Never commit `.env*` (except `.env.example`), tokens, passwords or service-account keys, and never print them. The Firebase web config is not secret, but keep it in `.env.local`.
- GitHub secret scanning and push protection are on; a blocked push means a secret was about to leak. Do not bypass it.

## Git
- Branch from `main` with your team prefix (`auth/`, `student/`, `events/`, `staff/`), keep PRs small, and open a PR. Fill in "Proof it works" with a real screenshot or test output.
- Only add fields; never rename an existing field or change its type.
- Work in your team's folder under `features/` (see `features/README.md`).

<!-- END:project-guardrails -->
