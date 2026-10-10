import { FirebaseError } from "firebase/app";
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type ThirdPartyProviderId = "google" | "microsoft";

function providerFor(id: ThirdPartyProviderId) {
  if (id === "google") {
    return new GoogleAuthProvider();
  }

  const microsoft = new OAuthProvider("microsoft.com");
  // "common" accepts school/work and personal Microsoft accounts.
  microsoft.setCustomParameters({ tenant: "common", prompt: "select_account" });
  return microsoft;
}

// True when the user signed in with Google/Microsoft rather than a password.
export function usesThirdPartyLogin(user: User) {
  return user.providerData.some(
    (provider) => provider.providerId !== "password",
  );
}

// Creates users/{uid} as a student the first time someone signs in with a
// provider. Never overwrites an existing profile (staff keep their role).
export async function ensureUserProfile(user: User) {
  const profileRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(profileRef);

  if (snapshot.exists()) {
    return;
  }

  const email = user.email ?? "";
  const name = user.displayName?.trim() || email.split("@")[0] || "Student";

  await setDoc(profileRef, {
    name,
    email,
    role: "student",
    createdAt: serverTimestamp(),
  });
}

export async function signInWithThirdParty(id: ThirdPartyProviderId) {
  const credential = await signInWithPopup(auth, providerFor(id));
  await ensureUserProfile(credential.user);
  return credential.user;
}

// Returns "" when there is nothing to show (the person closed the popup).
export function thirdPartyLoginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Could not sign in. Please try again.";
  }

  switch (error.code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/account-exists-with-different-credential":
      return "This email already has an account. Log in with your password.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Allow popups for this site, then try again.";
    case "auth/operation-not-allowed":
      return "This sign-in option is not turned on yet.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "permission-denied":
      return "Firebase blocked the profile write. Publish the latest Firestore rules, then try again.";
    default:
      return "Could not sign in. Please try again.";
  }
}
