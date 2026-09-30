## What this PR does
<!-- One or two sentences. Which team / feature? -->

## How to test
<!-- Preview URL + steps. Seeded logins: staff-<team>@example.com / student1@example.com, password localdev123 -->

## Firestore changes (required, even if "none")
Staging/dev uses open rules, so these will NOT fail there but WILL fail in production
unless someone writes strict rules. List everything so nothing is missed:

- **New or changed collections:**
- **New fields (collection.field, type):**
- **Who writes each one? (student / staff / guest / signed-out):**
- **New queries (filters/sorts/limits):**

## Checklist
- [ ] `npm run lint` and `npm run build` pass locally
- [ ] Only *added* fields; existing fields keep their names and types
- [ ] Test data uses my team's prefix, e.g. `[Auth] ...`
