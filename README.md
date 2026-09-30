# Spark Volunteering App

A website where students sign up for volunteering events and staff create and manage those events.

This guide assumes you are new to coding. Read the first three sections once, then use the rest as a reference.

**Contents**

1. [The big picture](#1-the-big-picture)
2. [Words you will see](#2-words-you-will-see)
3. [One-time setup](#3-one-time-setup)
4. [Your everyday workflow](#4-your-everyday-workflow)
5. [A tour of the code](#5-a-tour-of-the-code)
6. [Firebase: login and the database](#6-firebase-login-and-the-database)
7. [Cloudflare: where the website runs](#7-cloudflare-where-the-website-runs)
8. [Environments and deploying](#8-environments-and-deploying)
9. [Config and secrets](#9-config-and-secrets)
10. [Command cheat sheet](#10-command-cheat-sheet)
11. [When something breaks](#11-when-something-breaks)
12. [Rules of the road](#12-rules-of-the-road)
13. [Using an AI assistant well](#13-using-an-ai-assistant-well)
14. [For the maintainer](#14-for-the-maintainer)

---

## 1. The big picture

Three services work together. You only ever edit the code in this repository.

```
   Your browser
        |
        |  1. asks for the website (pages, buttons, styling)
        v
  +-------------+
  | Cloudflare  |   hosts the website's code and sends it to browsers
  +-------------+

   Your browser
        |
        |  2. logs users in, saves and loads events and signups
        v
  +-------------+
  |  Firebase   |   keeps user accounts (login) and all the data (database)
  +-------------+

   GitHub keeps the code, runs automatic checks on every change,
   and tells Cloudflare when to publish a new version.
```

- **The app** is written with **Next.js**, which is built on **React**. Both are ways of writing web pages in TypeScript (JavaScript with extra safety checks).
- **Firebase** is Google's "backend in a box". This app has no server of its own. The browser talks straight to Firebase, and a file of **rules** decides who is allowed to read or change what.
- **Cloudflare** is the company that serves our website to visitors. We use its **Workers** product, which runs the app on their computers around the world.
- **GitHub** stores the code, lets us review each other's changes, and runs **GitHub Actions** (robots) that test and publish the site.

## 2. Words you will see

| Word | What it means |
|---|---|
| **Git** | A tool that saves the history of every change to the code. |
| **Repository (repo)** | The project folder that Git tracks. |
| **Branch** | Your own copy of the code to work on without breaking anyone else. |
| **Commit** | A saved checkpoint of your changes, with a short message. |
| **Pull request (PR)** | "Please review my branch and add it to the main code." |
| **Merge** | Adding an approved branch into `main`. |
| **`main`** | The branch that holds the shared, working code. |
| **Node.js / npm** | Node runs JavaScript on your computer. npm installs libraries and runs the project's commands (`npm run ...`). |
| **Component** | A reusable piece of a page, like a form or a list. Lives in `components/`. |
| **Authentication (Auth)** | Logging in: proving who you are. |
| **Firestore** | Firebase's database. Data is stored as **documents** (like a form with named fields) inside **collections** (like folders). |
| **Security rules** | A file (`firestore.rules`) that says who may read or write which documents. |
| **Emulator** | A pretend copy of Firebase running on your own laptop, so you can test without touching real data. |
| **Environment** | A separate copy of the app: your laptop, staging or production. |
| **Preview URL** | A temporary website address made for one PR so you can try your change online. |
| **CI** | Automatic checks (lint, build, tests) that run on every PR. A green check means they passed. |
| **Deploy** | Publishing a version of the site so people can use it. |
| **Lint** | A tool that spots common mistakes and style problems in code. |

## 3. One-time setup

### 3.1 Install these tools

You need: **Git**, **Node.js** (version 20.9 or newer; 24 is what the robots use), **Java** (version 21 or newer, needed only for the Firebase emulator), and a code editor like VS Code.

**Mac** (install [Homebrew](https://brew.sh) first if you don't have it):

```bash
brew install git node openjdk
```

**Windows**: use **WSL** (a Linux inside Windows). Open PowerShell as administrator and run `wsl --install`, restart, then follow the Ubuntu steps below inside the Ubuntu window. The project's commands use Mac/Linux syntax and will not work in plain Windows PowerShell.

**Ubuntu / WSL:**

```bash
sudo apt update && sudo apt install -y git openjdk-21-jdk
curl -fsSL https://fnm.vercel.app/install | bash   # then open a new terminal
fnm install 24
```

Check everything worked. Each command should print a version number:

```bash
git --version
node --version
java -version
```

### 3.2 Get the code

```bash
git clone https://github.com/Spark-PNW/volunteering_app
cd volunteering_app
npm install
```

You need write access to the repository to push branches. Ask the maintainer to add your GitHub account.

### 3.3 Run the app on your laptop

```bash
npm run dev:local
```

This starts two things together: a fake copy of Firebase (the emulators) and the website. Wait until you see lines that say the emulators are ready and `Ready` from Next.js (about 20 seconds).

Open **http://localhost:3000** in your browser. That is the app.

In a **second terminal window** (same folder), add sample data:

```bash
npm run seed:emulator
```

Now you can log in with these sample accounts. The password for all of them is `localdev123`.

| Account | Role |
|---|---|
| `staff-auth@example.com`, `staff-student@example.com`, `staff-events@example.com`, `staff-staff@example.com` | staff (one per team) |
| `student1@example.com`, `student2@example.com`, `student3@example.com` | student |

You can also click **Sign up** to make your own account. Every new sign-up is a **student**. To make an account **staff** on your laptop:

```bash
npm run make-staff -- you@example.com
```

Other addresses that are useful while it's running:

| Address | What it is |
|---|---|
| http://localhost:3000 | The app |
| http://localhost:4000 | Emulator dashboard: look at the fake users and database, and read emulator logs |

To stop everything, press `Ctrl+C` **once** in the terminal and wait a few seconds. Your fake data is saved automatically in `.emulator-data/` and comes back next time. Delete that folder for a clean start.

Everything on your laptop is fake. You cannot damage real data by experimenting.

## 4. Your everyday workflow

Follow these steps for every change.

**1. Get the latest code**

```bash
git checkout main
git pull origin main
```

**2. Make your own branch.** Start the name with your team's prefix:

| Team | Prefix |
|---|---|
| Account & Authentication | `auth/` |
| Student Volunteer Experience | `student/` |
| Event Management | `events/` |
| Staff Experience | `staff/` |

```bash
git checkout -b events/add-capacity-field
```

**3. Run the app** (`npm run dev:local`) and make your change. The page refreshes by itself when you save a file.

**4. Check your work** before you share it:

```bash
npm run lint      # finds common mistakes
npm run build     # makes sure the app compiles
```

**5. Save and upload your work**

```bash
git add -A
git commit -m "Add capacity field to event form"
git push -u origin events/add-capacity-field
```

**6. Open a pull request.** GitHub prints a link after the push, or go to the repository page and click **Compare & pull request**. Fill in the template. The part called **Firestore changes** is required (see [section 6](#6-firebase-login-and-the-database)).

**7. Watch the robots.** After a minute or two:

- **check** (a green tick): lint, build and rules tests passed. If it's red, click it, read the error and fix it, then push again.
- **A comment with a preview link** appears on your PR. That link is your change running online. Click it to test. It uses the shared staging database.

**8. Get a review.** A teammate approves the PR.

**9. Stay up to date.** `main` only accepts branches that are *up to date*. If the PR says "This branch is out-of-date", click **Update branch** on the PR page (or run `git pull origin main` and push). Your checks re-run.

**10. Merge.** Click **Squash and merge**. Within a couple of minutes your change appears on **staging** automatically.

Merge small changes often. The longer your branch lives, the more it drifts from everyone else's, and the harder it is to combine. Update from `main` whenever a teammate merges something.

## 5. A tour of the code

```
app/                 The pages. Each folder is a web address.
  login/, signup/      /login, /signup
  dashboard/           /dashboard (the home screen after login)
  staff/               /staff/... pages that only staff can use
components/          The building blocks used by pages (forms, lists, buttons)
lib/
  firebase.ts          Connects the app to Firebase (and to the emulators locally)
  opportunities.ts     Helpers for event data (dates, hours)
  signups.ts           Helpers for signup ids
firestore.rules      Security rules for production (strict)
firestore.dev.rules  Security rules for staging and the emulator (open)
tests/               Tests that check the security rules
scripts/             Helper scripts: seed.mjs (sample data), make-staff.mjs
.github/workflows/   The robots: CI, preview builds, deploys
wrangler.jsonc       Cloudflare settings
next.config.ts       Next.js settings
```

An **"opportunity"** in the code is a volunteering **event**. A **"signup"** is one student signing up for one event.

**Where each team mostly works** (to avoid stepping on each other):

| Team | Mostly edits |
|---|---|
| Account & Authentication | `components/auth-form.tsx`, `app/login`, `app/signup`, guest-linking inside `components/opportunity-signup.tsx` |
| Student Volunteer Experience | `components/dashboard.tsx`, `components/student-opportunities-list.tsx` |
| Event Management | `components/create-opportunity-form.tsx`, new template and recurrence files, capacity in `components/opportunity-signup.tsx` |
| Staff Experience | `components/staff-opportunities-list.tsx`, `components/navigation-links.tsx`, `components/staff-gate.tsx` |

`components/opportunity-detail.tsx` is big and shared by several teams. **Put new UI in a new component file** and import it there, so you only make a small edit to the shared file. That prevents most merge conflicts.

## 6. Firebase: login and the database

Firebase does two jobs for us:

1. **Authentication**: sign up, log in, sessions. We use email + password.
2. **Firestore**: the database. It holds:

| Collection | What's in it |
|---|---|
| `users` | One document per person: `name`, `email`, `role` (`student` or `staff`) |
| `opportunities` | The events: title, date, hours, location, and so on |
| `signups` | One document per (student, event) pair. Its id is `<eventId>_<email>` |
| `eventTemplates` | Reusable event templates (staff only) |

The browser talks to Firestore directly, using code in `components/`. **Nothing sits in between to protect the data, so the security rules do that job.**

### Security rules in plain words

`firestore.rules` is a file Google checks on **every** read and write. If the rules say no, the app gets:

```
FirebaseError: Missing or insufficient permissions.
```

That message doesn't say which rule refused. This is the most common "bug" you will hit. Three facts explain most of it:

1. **The rules list the allowed fields.** If your code saves a field the rules don't list, the whole write is refused.
2. **The rules check who you are.** Students, staff and signed-out visitors can each do different things.
3. **Production and staging use different rules.**

| | Rules file | Behaviour |
|---|---|---|
| Your laptop (emulator) | `firestore.dev.rules` | Open: any signed-in user can do anything |
| Staging (and PR previews) | `firestore.dev.rules` | Open |
| **Production** | `firestore.rules` | **Strict** |

So a change can work everywhere except production. **Your PR must list every new field and who writes it** (the PR template asks). The maintainer uses that list to update the strict rules.

To try your change against the strict rules locally, use two terminals instead of `dev:local`:

```bash
npm run emulators:strict                    # terminal 1: emulators with the strict rules
NEXT_PUBLIC_USE_EMULATORS=true npx next dev  # terminal 2: the app
```

Then seed sample data with `npm run seed:emulator`. That script needs the open rules, so seed first under `dev:local`, stop it, then start the strict emulators (your data is kept in `.emulator-data/`).

### What the strict rules already allow

The production rules already include support for the planned features, so you shouldn't need to change them for these:

| Feature | What's in the rules |
|---|---|
| Check-in and completion | A signup can have `status` (`signed_up`, `checked_in`, `completed`), `checkedInAt`, `completedAt`. **Only staff** can change them. Students can create a signup only with no status or `signed_up`. |
| Linking a guest signup to an account | A signed-in user whose email is **verified** can claim a guest signup with the same email (it changes only `studentId` and `studentName`), and can read signups made with their email. |
| Capacity | An event can have `capacity` (whole number above 0) and `signupCount`. See the example below. |
| Templates and recurring events | Events can have `templateId`, `seriesId`, `recurrence`. Staff can read and write the `eventTemplates` collection. |
| Deleting events | Staff can delete any signup, so they can clean up when they delete an event. |

**Capacity example.** A student joining an event must add exactly 1 to `signupCount` **in the same write** as creating their own signup. Use a batch so both happen together or not at all:

```ts
import { doc, writeBatch } from "firebase/firestore";

const batch = writeBatch(db);
batch.update(doc(db, "opportunities", eventId), { signupCount: currentCount + 1 });
batch.set(doc(db, "signups", `${eventId}_${email}`), signupData);
await batch.commit();
```

Use the number you just read plus one (not `increment()`, which the rules can't check). Cancelling is the reverse: subtract 1 and delete the signup in the same batch. The count can't go above `capacity`.

Known limit: a signed-out guest can add 1 to the count without the rules being able to check that a signup was created. A server-side check is the long-term fix.

### Adding a new field or collection

1. Write the code.
2. Test on your laptop or preview (open rules, so it just works).
3. In the PR template's **Firestore changes** section, list the collection, the field, its type, and who writes it (student, staff, guest).
4. If the strict rules don't cover it, the maintainer adds it. If you're comfortable, you can edit `firestore.rules` and add a test in `tests/`, then run `npm run rules:test`.

Never rename a field or change its type. Only **add** fields, because everyone shares the same data.

### Firebase projects

| Project | Name in the console | Used by |
|---|---|---|
| Staging | `volunteering-39547` (called "volunteering") | Previews and staging. Test data only. |
| Production | `spark-volunteering-prod` | The live site. |

Console: https://console.firebase.google.com. You only need it if you're a maintainer.

## 7. Cloudflare: where the website runs

Cloudflare is a company that runs a huge network of computers around the world. We use **Workers**, which runs our Next.js app on those computers. Visitors get the site from a computer near them, so it loads fast.

You never log in to Cloudflare to work on the code. GitHub's robots publish for you. We use a tool called **OpenNext** to package the Next.js app for Cloudflare, and **Wrangler** (Cloudflare's command-line tool) to upload it.

We have two Workers in the Cloudflare account **Spark Internship 2026**:

| Worker | Address | Purpose |
|---|---|---|
| `volunteering-app-staging` | https://volunteering-app-staging.spark-internship-2026.workers.dev | Staging and PR previews |
| `volunteering-app` | https://volunteering-app.spark-internship-2026.workers.dev | **Production**, the live site |

Try the Cloudflare version of the app on your laptop:

```bash
npm run preview:cf   # builds it and runs it at http://localhost:8787
```

## 8. Environments and deploying

There are four places the app runs:

| Place | Firebase | Website | How it gets updated |
|---|---|---|---|
| **Your laptop** | Fake (emulators) | localhost:3000 | You run `npm run dev:local` |
| **PR preview** | Staging project | `https://pr-<number>-volunteering-app-staging.spark-internship-2026.workers.dev` | Automatically, every time you push to a PR |
| **Staging** | Staging project | volunteering-app-staging (above) | Automatically, every time something merges to `main` |
| **Production** | Production project | volunteering-app (above) | **By hand**, with an approval (see below) |

The journey of a change: your laptop, then a PR preview, then merged into `main`, which updates staging, and finally promoted to production.

### Deploying to staging

You don't do anything. Merging to `main` publishes to staging within a couple of minutes. Check https://volunteering-app-staging.spark-internship-2026.workers.dev.

### Deploying to production (maintainer)

1. Make sure staging looks right.
2. If `firestore.rules` changed, update the production rules **first**:
   ```bash
   npm run rules:deploy
   ```
   (You need to be logged in to Firebase. See [section 14](#14-for-the-maintainer).)
3. On GitHub go to **Actions**, choose **Deploy production**, click **Run workflow**, keep `main` (or type a commit or tag), and run it.
4. The run pauses until a reviewer clicks **Review deployments**, ticks **production**, then **Approve and deploy**.
5. Open the live site and click through: log in, create an event, sign up for it.

### Undoing a bad production deploy

Run **Deploy production** again and type the last good commit (or tag) in the `ref` box. That publishes the old version again.

### Keeping `main` safe

`main` is protected. To merge, a PR needs: the `check` job to pass, **one approval**, and the branch up to date with `main`. The maintainer (an admin) can bypass the approval in an emergency.

## 9. Config and secrets

**Firebase web config** is six values that tell the app which Firebase project to talk to. They are **not secret** (every visitor's browser sees them), but they differ per environment.

- **On GitHub** they live in **Settings > Environments** as variables in `staging` and `production`. The robots read them when they build.
- **On your laptop** you usually don't need them, because `dev:local` uses the emulators. If you need to run against the real staging project, copy `.env.example` to `.env.local` and ask the maintainer for the values, then run `npm run dev`. `.env.local` is never uploaded to GitHub.

The values are baked into the site **when it is built**, so changing one means building again.

**Real secrets:** the only one is `CLOUDFLARE_API_TOKEN`, stored in GitHub (Settings > Secrets). Never paste tokens or passwords into code, commits, PR comments or chat.

## 10. Command cheat sheet

Run these from the project folder.

| Command | What it does |
|---|---|
| `npm install` | Installs the libraries. Run after cloning and after `main` changes `package.json`. |
| `npm run dev:local` | **Main command.** Emulators + app at http://localhost:3000 |
| `npm run seed:emulator` | Adds sample users and events to the emulators (run while `dev:local` is running) |
| `npm run make-staff -- you@example.com` | Makes an existing emulator user staff |
| `npm run emulators:strict` | Emulators with the strict production rules |
| `npm run lint` | Checks for code mistakes |
| `npm run build` | Compiles the app (also checks types) |
| `npm run rules:test` | Tests the security rules |
| `npm run preview:cf` | Runs the Cloudflare version locally at localhost:8787 |
| `npm run dev` | App only, using whatever is in `.env.local` (real Firebase, be careful) |
| `npm run rules:deploy` | **Maintainer.** Publishes strict rules to production |
| `npm run rules:deploy:dev` | **Maintainer.** Publishes open rules to staging |
| `npm run seed:staff` | **Maintainer.** Creates the four staff accounts on staging |
| `npm run reset:cloud` | **Maintainer.** Deletes all staging data. Careful! |

## 11. When something breaks

| What you see | What to try |
|---|---|
| `Missing or insufficient permissions` | It's the security rules. Check the emulator log at http://localhost:4000 or the terminal running `dev:local`. It names the rule and line that said no. Common causes: a field the strict rules don't list, or an account that is a student trying a staff action. |
| "Confirm this account has role: staff" | Your account is a student. Locally run `npm run make-staff -- your@email`. On staging use a seeded staff account. |
| `Unable to locate a Java Runtime` or emulators won't start | Install Java 21+ ([section 3.1](#31-install-these-tools)). Open a new terminal afterwards. |
| `Port 8080 is not open` / `port taken` | An old emulator is still running. Close other terminals running `dev:local`, or run `lsof -ti tcp:8080 tcp:9099 tcp:3000 \| xargs kill`. |
| Page is blank or stuck loading | Look at the terminal running the app for red errors, and open the browser's console (right-click > Inspect > Console). |
| Login says the user doesn't exist | The emulator was reset or is empty. Run `npm run seed:emulator` again or sign up. |
| `npm run lint` fails | Read the file and line it names. Ask an AI assistant to explain it. |
| PR check is red | Click the red mark on the PR, then **Details**, and read the last lines of the log. |
| PR says "branch is out-of-date" | Click **Update branch**, or `git pull origin main` and push. |
| Merge conflict | Two people changed the same lines. Open the file, look for `<<<<<<<` markers, keep the right parts, delete the markers, commit. Ask for help if unsure. |
| Preview link says 404 right after it appears | Wait about 20 seconds and reload. |
| Something feels off after a big change | Delete the `.next/` folder and restart. |

## 12. Rules of the road

- **Only add fields.** Never rename a field or change its type.
- **Use fake data.** Put your team in test names, like `[Events] Test event`, and use your own test emails.
- **Don't run `reset:cloud`** or delete other people's data without asking.
- **Don't push straight to `main`.** It's protected. Use a branch and a PR.
- **Never commit secrets.** No passwords, tokens or `.env.local`.
- **Keep PRs small** and merge often. Update from `main` before you start each task.
- **Ask early.** Being stuck for 20 minutes is worth a message to your team.
- **Don't edit `firestore.rules` casually.** Changes there affect real users. Add tests and tell the maintainer.

## 13. Using an AI assistant well

AI tools are good at this project, and they make mistakes. Some habits help:

- **Give it context.** Tell it: "Next.js app on Cloudflare, Firebase Auth and Firestore, security rules in `firestore.rules`." Paste the exact error text.
- **For permission errors, share `firestore.rules`.** The bug is usually there, not in the component.
- **Ask it to explain before it changes.** "What does this file do?" then "Where should this change go?"
- **Run it.** Test the change in the browser, then run `npm run lint` and `npm run build`. Don't merge code you haven't seen work.
- **Keep changes small.** Ask for one thing at a time. Big AI rewrites of shared files (like `opportunity-detail.tsx`) cause merge conflicts.
- **Read what it wrote** before committing. You are responsible for it.
- Next.js in this repo is a very new version. If the AI suggests something that doesn't work, tell it the exact error. The docs for this version are inside `node_modules/next/dist/docs/`.

## 14. For the maintainer

### Accounts and links

| Thing | Where |
|---|---|
| Code | https://github.com/Spark-PNW/volunteering_app |
| Cloudflare account | "Spark Internship 2026" |
| Firebase staging | project `volunteering-39547`, https://console.firebase.google.com/project/volunteering-39547 |
| Firebase production | project `spark-volunteering-prod`, https://console.firebase.google.com/project/spark-volunteering-prod |
| GitHub environments | `staging` (no approval) and `production` (requires reviewer approval, `main` only) |
| GitHub secret | `CLOUDFLARE_API_TOKEN` ("Edit Cloudflare Workers" token for the account) |
| GitHub variables | `CLOUDFLARE_ACCOUNT_ID` (repo), `NEXT_PUBLIC_FIREBASE_*` (per environment) |

### Log in to the tools (once)

```bash
npx firebase login          # opens a browser
npx wrangler login          # opens a browser (only for manual deploys)
gh auth login               # GitHub CLI (optional)
```

### Making a staff user

- **Emulator:** `npm run make-staff -- email`
- **Staging:** four staff accounts exist (`staff-auth@`, `staff-student@`, `staff-events@`, `staff-staff@example.com`, password `localdev123`). Create more with `npm run seed:staff`.
- **Production:** sign up in the app, then in the Firebase console open Firestore > `users` > the person's document and change `role` to `staff`. There is no in-app way yet. If you need one, that's a good feature to build (an invite code or an admin page).

### Staging vs production rules

- Staging uses `firestore.dev.rules` (open). Deploy with `npm run rules:deploy:dev`.
- Production uses `firestore.rules` (strict). Deploy with `npm run rules:deploy`.
- The scripts point at the right project by name (`staging`, `production` in `.firebaserc`), so you can't mix them up by accident.
- Every PR's **Firestore changes** section is the to-do list for the strict rules. Review those, extend `firestore.rules`, add a test in `tests/`, run `npm run rules:test`, then deploy to production **before** promoting the code that needs them.

### Before real users arrive

- [ ] Production data is real from now on. **Never** deploy `firestore.dev.rules` to `spark-volunteering-prod`.
- [ ] Turn on email verification and password reset flows (Team 1), and test them with real inboxes.
- [ ] Add each domain that sends users through email links to Firebase > Authentication > Settings > **Authorized domains**. Firebase doesn't accept wildcards, so a custom domain is easier than adding every preview address.
- [ ] Decide how reminder emails are sent. They need a scheduled job and an email service, and nothing like that exists yet.
- [ ] Set a budget alert on both Firebase projects. The free plan stops at 50,000 reads a day, and live lists use reads quickly. Cloudflare's free plan allows 100,000 requests a day.
- [ ] Add a `CODEOWNERS` entry so `firestore.rules` always needs your review.
- [ ] Consider a custom domain in Cloudflare instead of `workers.dev`.
- [ ] Vercel builds are switched off by `vercel.json`. Delete that file to turn them back on. The old Vercel deployment still exists.

### Known limits

- Guests (signed out) can bump an event's `signupCount` by one without the rules being able to verify a signup exists. Anyone who wants to can inflate the count of an event. Fixing it needs a small server-side function.
- Free Firebase quotas are shared by every preview and staging user.
- `next.config.ts` aliases `@firebase/firestore` to its browser build because Cloudflare Workers block `eval`. Don't remove that.
