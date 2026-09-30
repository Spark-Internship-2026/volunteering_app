# 3. Deployments

Where the app runs, how your change goes live, and the maintainer's checklist.

[Back to the README](../README.md) · Previous: [Making a pull request](MAKING_A_PULL_REQUEST.md)

> **Production currently uses the OPEN rules (`firestore.dev.rules`).** Any signed-in user can read and write everything, including changing their own `role` to `staff`. This is a temporary choice while there are no real users. **Before real users arrive, run `npm run rules:deploy` to lock production down** (see the [launch checklist](#before-real-users-arrive)).

## Cloudflare in plain words

Cloudflare runs a huge network of computers around the world. We use its **Workers** product, which runs our Next.js app on those computers, so visitors get the site from one near them and it loads fast.

You never log in to Cloudflare to work on the code. GitHub's robots publish for you. We use a tool called **OpenNext** to package the Next.js app for Cloudflare, and **Wrangler** (Cloudflare's command-line tool) to upload it.

We have two Workers in the Cloudflare account **Spark Internship 2026**:

| Worker | Address | Purpose |
|---|---|---|
| `volunteering-app-staging` | https://volunteering-app-staging.spark-internship-2026.workers.dev | Staging and PR previews |
| `volunteering-app` | https://volunteering-app.spark-internship-2026.workers.dev | **Production**, the live site |

Try the Cloudflare version of the app on your laptop: `npm run preview:cf` (runs at http://localhost:8787).

## The four places the app runs

| Place | Firebase | Website | How it gets updated |
|---|---|---|---|
| **Your laptop** | Fake (emulators) | localhost:3000 | You run `npm run dev:local` |
| **PR preview** | Staging project | `https://pr-<number>-volunteering-app-staging.spark-internship-2026.workers.dev` | Automatically, every time you push to a PR |
| **Staging** | Staging project | volunteering-app-staging (above) | Automatically, every time something merges to `main` |
| **Production** | Production project | volunteering-app (above) | **By hand**, with an approval (below) |

The journey of a change: your laptop, then a PR preview, then merged into `main`, which updates staging, and finally promoted to production.

### Firebase projects

| Project | ID | Used by | Rules deployed now |
|---|---|---|---|
| Staging | `volunteering-39547` (called "volunteering" in the console) | Previews and staging. Test data only. | Open |
| Production | `spark-volunteering-prod` | The live site | **Open (temporary)** |

Console: https://console.firebase.google.com

## Deploying to staging

You do nothing. Merging to `main` publishes to staging within a couple of minutes. Check https://volunteering-app-staging.spark-internship-2026.workers.dev.

## Deploying to production (maintainer)

1. Make sure staging looks right.
2. If the rules changed, update production **first** (see [Rules](#security-rules-what-is-deployed-where)).
3. On GitHub go to **Actions**, choose **Deploy production**, click **Run workflow**, keep `main` (or type a commit or tag), and run it.
4. The run pauses until a reviewer clicks **Review deployments**, ticks **production**, then **Approve and deploy**.
5. Open the live site and click through: log in, create an event, sign up for it.

### Undoing a bad production deploy

Run **Deploy production** again and type the last good commit (or tag) in the `ref` box. That publishes the old version again.

### How `main` is protected

To merge into `main`, a PR needs: the `check` and `proof` jobs to pass, **one approval**, **a review from the code owner** if it touches protected files, and the branch up to date with `main`. The maintainer (an admin) can bypass approvals in an emergency.

## Security rules: what is deployed where

| Command | Deploys | To |
|---|---|---|
| `npm run rules:deploy` | **Strict** `firestore.rules` | Production |
| `npm run rules:deploy:dev` | **Open** `firestore.dev.rules` | Staging |
| `firebase deploy --only firestore:rules --config firebase.dev.json --project production` | **Open** rules | Production (this is how it was set to open) |

The scripts point at the right project by name (`staging`, `production` in `.firebaserc`). Rules are **not** part of the normal app deploy: deploy them by hand, and deploy production rules **before** promoting code that needs them.

The strict rules are tested (`npm run rules:test`) and already cover the planned features (check-in status, verified guest-signup linking, capacity, templates, staff cleanup). Every PR's **Firestore changes** section is the to-do list for keeping them current.

## Config and secrets

**Firebase web config** is six values that tell the app which Firebase project to talk to. They are **not secret** (every browser sees them) but they differ per environment. On GitHub they live in **Settings > Environments** as variables in `staging` and `production`, and the robots read them when they build. They are baked in at build time.

**Real secret:** the only one is `CLOUDFLARE_API_TOKEN` (an "Edit Cloudflare Workers" token for the account), stored in GitHub Settings > Secrets. Anyone with write access can read secrets through a workflow, so keep it scoped to Workers only, and never paste tokens or passwords into code, commits, PR comments or chat.

## For the maintainer

### Accounts and links

| Thing | Where |
|---|---|
| Code | https://github.com/Spark-PNW/volunteering_app |
| Cloudflare account | "Spark Internship 2026" |
| Firebase staging | https://console.firebase.google.com/project/volunteering-39547 |
| Firebase production | https://console.firebase.google.com/project/spark-volunteering-prod |
| GitHub environments | `staging` (no approval) and `production` (reviewer approval, `main` only) |
| GitHub secret | `CLOUDFLARE_API_TOKEN` |
| GitHub variables | `CLOUDFLARE_ACCOUNT_ID` (repo), `NEXT_PUBLIC_FIREBASE_*` (per environment) |
| Code owner | `@seanjlam97` (see `.github/CODEOWNERS`) |

### Log in to the tools (once)

```bash
npx firebase login          # opens a browser
npx wrangler login          # opens a browser (only for manual deploys)
gh auth login               # GitHub CLI (optional)
```

### Making a staff user

- **Emulator:** `npm run make-staff -- email`
- **Staging:** four staff accounts exist (`staff-auth@`, `staff-student@`, `staff-events@`, `staff-staff@example.com`, password `localdev123`). Recreate them with `npm run seed:staff`.
- **Production:** sign up in the app, then in the Firebase console open Firestore > `users` > the person's document and change `role` to `staff`. There is no in-app way yet (an invite code or admin page would be a good feature).

### Before real users arrive

- [ ] **Lock production down:** `npm run rules:deploy` (strict rules). Then test the main flows on the live site, because anything that only worked under the open rules will break. Fix by extending `firestore.rules`, with a test.
- [ ] Clear test data from production (Firebase console) or start a fresh project.
- [ ] Turn on and test email verification and password reset with real inboxes (Team 1).
- [ ] Add every domain that sends users through email links to Firebase > Authentication > Settings > **Authorized domains**. Firebase doesn't accept wildcards, so a custom domain is easier than adding every preview address.
- [ ] Decide how reminder emails are sent. They need a scheduled job and an email service, and nothing like that exists yet.
- [ ] Set a budget alert on both Firebase projects. The free plan stops at 50,000 reads a day. Cloudflare's free plan allows 100,000 requests a day.
- [ ] Consider a custom domain in Cloudflare instead of `workers.dev`.
- [ ] Vercel builds are switched off by `vercel.json`. Delete that file to turn them back on. The old Vercel deployment still exists.

### Known limits

- **While production is open**, anyone with an account can edit or delete any data and make themselves staff.
- Guests (signed out) can bump an event's `signupCount` by one without the rules being able to verify a signup exists (strict rules). The long-term fix is a small server-side function.
- Free Firebase quotas are shared by every preview and staging user.
- `next.config.ts` aliases `@firebase/firestore` to its browser build because Cloudflare Workers block `eval`. Don't remove that.
