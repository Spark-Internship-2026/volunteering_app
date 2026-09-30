# Working in parallel

## Branch and PR flow
1. Branch from `main` using your team prefix: `auth/…`, `student/…`, `events/…`, `staff/…`.
2. Develop locally: `npm run dev:local`, then `npm run seed:emulator` for sample data.
3. Open a PR. CI must pass (lint, build, rules tests). A bot comments a preview URL (`pr-<number>-volunteering-app-staging…workers.dev`).
4. Fill in the **Firestore changes** section of the PR template. Strict rules get written from it.
5. One approval, then merge. `main` requires your branch to be up to date: click **Update branch** on the PR (or `git pull origin main`) whenever it says you're behind.
6. Every merge to `main` deploys to staging automatically. Production is promoted manually by the maintainer.

## Who touches what (to limit merge conflicts)
| Team | Mostly edits | Should avoid |
|---|---|---|
| Account & Authentication | `components/auth-form.tsx`, `app/login`, `app/signup`, guest-linking in `components/opportunity-signup.tsx` | list/detail components |
| Student Volunteer Experience | `components/dashboard.tsx`, `components/student-opportunities-list.tsx` | staff components |
| Event Management | `components/create-opportunity-form.tsx`, new template/recurrence files, capacity in `components/opportunity-signup.tsx` | student list |
| Staff Experience | `components/staff-opportunities-list.tsx`, `components/navigation-links.tsx`, `components/staff-gate.tsx` | student list |

`components/opportunity-detail.tsx` (780 lines) is shared. Put new UI in **new component files** and import them, so the shared file only gets small edits.

## Data rules (shared cloud project uses open rules)
- Only **add** fields. Never rename or change the type of an existing field.
- Prefix test data with your team, e.g. `[Events] Test event`, and use your own emails.
- Never commit secrets. Firebase web config is public, but keep it in `.env.local`.
