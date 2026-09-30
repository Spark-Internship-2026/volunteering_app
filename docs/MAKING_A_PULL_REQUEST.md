# 2. Making a pull request

How to change the code safely and get it reviewed. Follow these steps for every change.

[Back to the README](../README.md) · Previous: [Setup](SETUP.md) · Next: [Deployments](DEPLOYMENTS.md)

## The steps

**1. Get the latest code**

```bash
git checkout main
git pull origin main
```

**2. Make your own branch.** Start the name with your team's prefix (`auth/`, `student/`, `events/` or `staff/`). Work mostly inside your team's folder under `features/` (see [`features/README.md`](../features/README.md)):

```bash
git checkout -b events/add-capacity-field
```

**3. Run the app** (`npm run dev:local`) and make your change. The page refreshes by itself when you save a file.

**4. Check your work** before you share it:

```bash
npm run lint      # finds common mistakes
npm run build     # makes sure the app compiles
```

**5. Prove it works.** Capture a screenshot or short screen recording of your change working (see [Proof it works](#proof-it-works-required)). Do this before you open the PR so you have it ready.

**6. Save and upload your work**

```bash
git add -A
git commit -m "Add capacity field to event form"
git push -u origin events/add-capacity-field
```

**7. Open a pull request.** GitHub prints a link after the push, or click **Compare & pull request** on the repository page. Fill in every section of the template, including the proof.

**8. Watch the robots** (a minute or two). See [What the checks mean](#what-the-checks-mean).

**9. Get a review.** A teammate approves the PR.

**10. Stay up to date.** `main` only accepts branches that are *up to date*. If the PR says "This branch is out-of-date", click **Update branch** on the PR page (or run `git pull origin main` and push). Your checks re-run.

**11. Merge.** Click **Squash and merge**. Within a couple of minutes your change appears on **staging** automatically (see [Deployments](DEPLOYMENTS.md)).

Merge small changes often. The longer your branch lives, the more it drifts from everyone else's and the harder it is to combine. Update from `main` whenever a teammate merges something.

## Proof it works (required)

Every PR needs proof that the thing you built actually works, shown **on your laptop (localhost:3000) or on the preview link** the bot posts on your PR. A check called **proof** stays red until the "Proof it works" section of your description contains real proof.

**Best: a screenshot or a short screen recording.**

- Show the feature working. Before and after is even better.
- Screenshot on Mac: `Cmd + Shift + 4`. Screen recording on Mac: `Cmd + Shift + 5`.
- Screenshot on Windows: `Win + Shift + S`. Recording: `Win + G`.
- **Drag the file into the PR description box.** GitHub uploads it and inserts a link for you. Keep videos under about 10 MB (a few seconds is enough).
- Make sure the address bar or the page clearly shows what environment you tested on.

**If there is nothing to look at** (security rules, scripts, config), paste the real terminal or test output inside a code block instead, for example the last lines of `npm run rules:test`.

**Not accepted:** "it works", an empty section, or a screenshot of a different page. Reviewers will send it back.

## What the checks mean

After you open a PR, look at the bottom of the page:

| Check | What it does | If it's red |
|---|---|---|
| **check** | Runs lint, builds the app and runs the security-rule tests | Click **Details**, read the last lines of the log, fix, push again |
| **proof** | Looks for a screenshot, recording or real output in "Proof it works" | Edit the PR description (no new push needed) |
| **preview** | Builds your branch and posts a link like `https://pr-12-volunteering-app-staging.spark-internship-2026.workers.dev` | Click **Details** to see why it failed |

The preview uses the shared **staging** database. Use fake data with your team in the name (`[Events] Test event`).

**Code owners:** files that control security and deployment (`firestore.rules`, `firestore.restricted.rules`, `firestore.dev.rules`, `firebase*.json`, `wrangler.jsonc`, everything in `.github/`) need a review from the code owner, `@seanjlam97`. GitHub adds them automatically.

## Firebase and the security rules

Firebase does two jobs for us:

1. **Authentication**: sign up, log in, sessions. We use email and password.
2. **Firestore**: the database. It holds:

| Collection | What's in it |
|---|---|
| `users` | One document per person: `name`, `email`, `role` (`student` or `staff`) |
| `opportunities` | The events: title, date, hours, location, and so on |
| `signups` | One document per (student, event) pair. Its id is `<eventId>_<email>` |
| `eventTemplates` | Reusable event templates (staff only) |

The browser talks to Firestore directly, using code in the `features/` folders. **Nothing sits in between to protect the data, so the security rules do that job.**

### Security rules in plain words

`firestore.rules` is a file Google checks on **every** read and write. If the rules say no, the app gets:

```
FirebaseError: Missing or insufficient permissions.
```

That message does not say which rule refused. This is the most common "bug" you will hit. Three facts explain most of it:

1. **The strict rules list the allowed fields.** If your code saves a field the rules don't list, the whole write is refused.
2. **The rules check who you are.** Students, staff and signed-out visitors can each do different things.
3. **There are two rules files.**

| Rules file | What it does | Used by |
|---|---|---|
| `firestore.dev.rules` | **Open.** Any signed-in user can do anything. | Your laptop (`npm run dev:local`) |
| `firestore.restricted.rules` | **Restricted.** Blocks the dangerous things (see below), open for everything else. | **Staging, PR previews and production** (see [Deployments](DEPLOYMENTS.md)) |
| `firestore.rules` | **Strict.** Field lists and role checks on every collection. | Nowhere in the cloud right now. It is the target for launch. |

Your laptop runs the open rules, but **staging, your PR preview and production run the restricted rules**. So a change can work on your laptop and still get "permission denied" on the preview. Check before you push:

```bash
npm run dev:restricted      # like dev:local, but the emulators enforce the restricted rules
npm run seed:emulator       # in a second terminal, for sample data
```

If it works there, it will work on the preview. The table below lists what the restricted rules block. Your PR must also list every new field and who writes it (the template asks), so the maintainer can keep the strict launch rules ready.

To try the strict launch rules instead, run `npm run emulators:strict` in one terminal and `NEXT_PUBLIC_USE_EMULATORS=true npx next dev` in another (your data is kept in `.emulator-data/`).

### What the restricted rules block (staging, previews, production)

These rules block a short list of dangerous things and leave the rest open, so you can build without editing rules. If a feature hits one of them you will see "permission denied" on the preview; reproduce it locally with `npm run dev:restricted`.

| Blocked | In plain words |
|---|---|
| Changing your own `role` | Nobody can make themselves staff. Staff are made in the Firebase console. |
| Reading other people's data | You can read only your own user document and your own signups. Staff can read all signups. |
| Changing events | Only staff create, edit or delete events. Students may only bump the capacity counter (see the capacity example). |
| Touching someone else's signup | You can only create, change or delete your own. A signed-out guest can only re-save an existing *guest* signup. |
| Forging hours credit | Students and guests cannot set `status`, `checkedInAt` or `completedAt`, or add extra fields to a signup. Staff can. |

Still open: any **new top-level collection** (any signed-in user), any new fields on events (staff) and on your own user document (except `role`), and any new fields that staff add to a signup. Subcollections under `users`, `opportunities`, `signups` and `eventTemplates` are **not** open: use a new top-level collection instead.

### What the strict rules already allow

The strict rules already include the planned features, so you should not need to change them for these:

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
2. Test on your laptop or preview.
3. In the PR template's **Firestore changes** section, list the collection, the field, its type and who writes it (student, staff, guest).
4. If the strict rules don't cover it, add it to `firestore.rules` and write a test in `tests/`, then run `npm run rules:test`. The code owner reviews it.

Never rename a field or change its type. Only **add** fields, because everyone shares the same data.

## Rules of the road

- **Only add fields.** Never rename a field or change its type.
- **Use fake data.** Put your team in test names, like `[Events] Test event`, and use your own test emails.
- **Don't run `reset:cloud`** or delete other people's data without asking.
- **Don't push straight to `main`.** It's protected. Use a branch and a PR.
- **Never commit secrets.** No passwords, tokens or `.env.local`.
- **Keep PRs small** and merge often. Update from `main` before you start each task.
- **Ask early.** Being stuck for 20 minutes is worth a message to your team.
- **Don't edit the rules files casually.** They protect real data. Add tests and expect a review.

## Using an AI assistant well

AI tools are good at this project, and they make mistakes. Some habits help:

- **Give it context.** Tell it: "Next.js app on Cloudflare, Firebase Auth and Firestore, security rules in `firestore.rules`." Paste the exact error text.
- **For permission errors, share `firestore.rules`.** The bug is usually there, not in the component.
- **Ask it to explain before it changes.** "What does this file do?" then "Where should this change go?"
- **Run it.** Test the change in the browser, then run `npm run lint` and `npm run build`. Don't merge code you haven't seen work. Your proof is the evidence.
- **Keep changes small.** Ask for one thing at a time. Big AI rewrites of shared files (like `features/event-management/event-detail-page.tsx`) cause merge conflicts.
- **Read what it wrote** before committing. You are responsible for it.
- The Next.js in this repo is a very new version. If the AI suggests something that doesn't work, tell it the exact error. The docs for this version are inside `node_modules/next/dist/docs/`.

### Guardrails for AI tools, and the shared quota

The repo has an `AGENTS.md` file with rules for AI assistants (Claude Code, Cursor, Copilot and others read it automatically). **If your assistant seems to ignore it, paste this into the chat: "Read AGENTS.md and follow it."** The short version:

- **Work on the emulators** (`npm run dev:local` or `npm run dev:restricted`), not on staging or production. Never point `.env.local` at production.
- **The AI must not** deploy, run `reset:cloud`, log in to Firebase or Cloudflare, force-push, push to `main`, or edit the rules, `firebase*.json`, `wrangler.jsonc` or `.github/`. If it says it needs to, stop and ask the maintainer.
- **"Permission denied" is not fixed by loosening the rules.** Reproduce it with `npm run dev:restricted` (see above).

**Why the quota matters.** Staging is one Firebase project shared by everyone, and the free plan allows only 50,000 reads a day. A bug such as a `useEffect` that re-subscribes in a loop can use all of it in minutes, and then every teammate's preview stops working until the next day (midnight Pacific). AI-written code makes this mistake easily. Before you open a PR:

1. Every `onSnapshot` must return its unsubscribe function from the effect cleanup.
2. Effects must not depend on objects, arrays or functions created during render.
3. Don't read inside loops, timers or on every keystroke, and don't read a whole collection when you need a few documents (use a query with `limit()`).
4. Open each page you changed once on the emulator and look at the terminal or the emulator log. If you see the same request repeating, fix it before you push.

Next: [Deployments](DEPLOYMENTS.md)
