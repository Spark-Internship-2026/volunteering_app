## What this PR does
<!-- One or two sentences. Which team / feature? -->

## Proof it works
<!--
REQUIRED. A check fails until this section has real proof that your change works.
Show it working on your laptop (localhost:3000) or on the preview link the bot posts on this PR.

Best: a screenshot or a short screen recording (drag the file into this box, GitHub will
turn it into a link). Show the before and the after if you can.

If there is nothing to look at (rules, scripts, config), paste the real terminal/test output
in a code block instead.
-->


## How to test
<!-- Steps a reviewer can follow, starting from the preview URL.
Staging logins: staff-auth@ / staff-student@ / staff-events@ / staff-staff@example.com (password localdev123); sign up for a student. -->

## Firestore changes (required, even if "none")
Staging and the emulator use open rules, so a change can work there and still be blocked
in production if the strict rules do not allow it. List everything so nothing is missed:

- **New or changed collections:**
- **New fields (collection.field, type):**
- **Who writes each one? (student / staff / guest / signed-out):**
- **New queries (filters/sorts/limits):**

## Checklist
- [ ] `npm run lint` and `npm run build` pass locally
- [ ] Only *added* fields; existing fields keep their names and types
- [ ] Test data uses my team's prefix, e.g. `[Auth] ...`
