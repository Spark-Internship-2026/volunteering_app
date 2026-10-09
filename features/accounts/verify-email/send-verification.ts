import { FirebaseError } from "firebase/app";
import { sendEmailVerification, type User } from "firebase/auth";

// Emails the user a verification link. On the emulator no email is sent: the
// link is printed in the `npm run dev:local` terminal instead. No continue URL is
// passed, so the link works from PR preview domains that Firebase doesn't know.
export function sendVerification(user: User) {
  return sendEmailVerification(user);
}

// Asks Firebase whether the user has clicked the link yet. When they have, the
// ID token is refreshed so Firestore rules see `email_verified: true` right away.
export async function refreshVerified(user: User) {
  await user.reload();

  if (!user.emailVerified) {
    return false;
  }

  await user.getIdToken(true);
  return true;
}

export function verificationErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/too-many-requests":
        return "Too many emails sent. Wait a few minutes, then try again.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
    }
  }

  return "Could not send the verification email. Please try again.";
}
