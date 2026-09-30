# Features: one folder per team

Each team owns one folder. Work inside your folder and you will rarely touch anyone else's files, so merge conflicts stay small.

| Folder | Team | What lives here |
|---|---|---|
| `accounts/` | Account & Authentication | `auth-form.tsx` (login and signup pages). `signup-page/`: the page behind an event's QR code: `opportunity-signup.tsx` (loads the event and user, then picks a view), `signed-out-signup-view.tsx`, `guest-signup-card.tsx` (guest signup and future account linking), `inline-login-card.tsx` |
| `student-experience/` | Student Volunteer Experience | `student-opportunities-list.tsx` (loads events, handles signup and remove), `volunteering-stats.tsx`, `student-event-cards.tsx`, `student-event-modal.tsx`, `signed-in-signup-panel.tsx`, `event-roster.tsx` (the signed-up students table on the staff event page: the place for check-in and completion status) |
| `event-management/` | Event Management | `create-event-form.tsx`, `event-details-section.tsx` (view and edit an event), `event-summary-card.tsx`, `event-detail-page.tsx` (thin page that lays out the sections) |
| `staff-experience/` | Staff Experience | `dashboard.tsx` with `dashboard-header.tsx`, `profile-card.tsx`, `staff-view-toggle.tsx`; `staff-opportunities-list.tsx` with `staff-event-grid.tsx`; `staff-gate.tsx`; `event-notes-section.tsx`; `opportunity-qr-code.tsx` |

Code used by more than one team is not in a feature folder:

- `shared/`: `navigation-links.tsx`, `types.ts` (for example `UserProfile`).
- `lib/`: Firebase setup and helpers (`firebase.ts`, `opportunities.ts`, `signups.ts`).

Changes to `shared/` and `lib/` affect everyone, so keep them small and get a review.

## Rules that keep teams independent

1. **Add new things as new files in your own folder.** Adding a field to the create form? Make a small component for it and render it from the form. Adding a column to the roster? Do it in `event-roster.tsx`. Don't grow files that other teams also edit.
2. **Pages are made of sections.** `event-detail-page.tsx` and `opportunity-signup.tsx` only load data and arrange sections. If you need a new section, add a new file and add one line to the page.
3. **Only import other teams' files to lay out a page.** The pages above combine sections from different teams (for example the event page uses the roster and notes sections). Otherwise, don't reach into another team's folder. If two teams need the same thing, move it to `shared/` in its own small PR.
4. **Every section handles its own data writes.** A section saves to Firestore itself and tells the page what changed (`onSaved`). The page never edits Firestore for a section.
