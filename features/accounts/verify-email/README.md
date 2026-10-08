# Email verification

Every account must verify its email before it can use the app. Signing up emails a link to the address; clicking it proves the person owns that email. Until then, the account is stuck on the `/verify-email` page.

Guest signups (from an event's QR code page, without an account) are not affected.

## How it works

We use Firebase Auth's built-in `sendEmailVerification`. Firebase sends the email and hosts the page the link opens, which marks the account as verified (`user.emailVerified`). There is no server, email service or Firestore data of our own.

1. **Sign up** (`auth-form.tsx`): after creating the account and its `users` document, send the link and go to `/verify-email`. If sending fails, the account is still created; the page has a resend button.
2. **Log in** (`auth-form.tsx`): verified accounts go to `/dashboard`, unverified ones to `/verify-email`.
3. **The `/verify-email` page** (`verify-email-notice.tsx`) shows the email the link went to and three buttons:
   - **I've verified it**: asks Firebase again and goes to `/dashboard` once verified.
   - **Resend email**: sends a new link, then waits 30 seconds before allowing another.
   - **Log out and sign up again**: for a mistyped email.
4. **The gate**: each page that needs a signed-in user sends unverified accounts to `/verify-email`, before reading anything from Firestore:
   - `features/staff-experience/dashboard.tsx` (`/dashboard`)
   - `features/staff-experience/staff-gate.tsx` (every `/staff/...` page)
   - `features/accounts/signup-page/opportunity-signup.tsx` (the event QR page when signed in, including its inline login)

   A new page for signed-in users needs the same check:

   ```ts
   if (!user.emailVerified) {
     router.replace("/verify-email");
     return;
   }
   ```

## Files

| File | What it does |
|---|---|
| `send-verification.ts` | `sendVerification(user)` sends the link. `refreshVerified(user)` reloads the user and returns whether they are verified; when they are, it also refreshes their login token so the Firestore rules see `email_verified: true` straight away. `verificationErrorMessage(error)` turns errors into friendly text. |
| `verify-email-notice.tsx` | The `/verify-email` page. The route itself is `app/verify-email/page.tsx`, which only renders this. |

## Testing on your laptop

The emulator doesn't send real email. It prints the link in the `npm run dev:local` terminal instead:

```
[emu] i  To verify the email address you@example.com, follow this link: http://127.0.0.1:9099/emulator/action?mode=verifyEmail&...
```

Open that link, then click **I've verified it**. Or skip the link:

```bash
npm run verify-email -- you@example.com
```

`npm run seed:emulator` marks the sample accounts (`staff-events@example.com` and the others) as verified. If they get stuck on the verify page, run it again.

## Staging and production

There, Firebase sends a real email from `noreply@<project>.firebaseapp.com` (check spam). Test accounts on PR previews need a real inbox. The shared `staff-*@example.com` staging accounts can't receive email, so the maintainer marks them verified with `npm run verify-email -- <email> --cloud` (see `docs/DEPLOYMENTS.md`).

## Limits and next steps

- The gate is in the app only. Someone calling Firestore directly could still use an unverified account. The fix is a rules change (require `email_verified` in `isStudent()` and `isStaff()`), which the rules code owner makes.
- After verifying, people always land on `/dashboard`, even if they came from an event's QR page.
- The email's wording and sender name are set in the Firebase console (Authentication > Templates).
