import { initializeApp, getApp, getApps } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const usingEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";

// The emulators don't talk to a real Firebase project, so they don't need real
// credentials. Firebase's SDK still requires config values to look well-formed
// (e.g. a non-empty apiKey), so fall back to placeholder values when no real
// .env.local values are set. projectId must match the "volunteering-39547" id
// that scripts/make-staff.mjs, scripts/seed.mjs, and the rules tests hardcode —
// the Firestore emulator runs in single-project mode and rejects a mismatched
// project id from other clients once one has connected with a different one.
//
// Without any key at all (for example `npm run build` on a fresh clone), Firebase
// throws at import time and the build fails, so use a placeholder there too. Real
// Firebase calls fail until .env.local is filled in.
if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !usingEmulators && typeof window !== "undefined") {
  console.warn("NEXT_PUBLIC_FIREBASE_API_KEY is not set; Firebase is using placeholder config.");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || (usingEmulators ? "demo-api-key" : "missing-api-key"),
  // Google/Microsoft popup sign-in refuses to start without an authDomain, even
  // on the emulator (which ignores the value), so give it a placeholder there.
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (usingEmulators ? "localhost" : undefined),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? (usingEmulators ? "volunteering-39547" : undefined),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? (usingEmulators ? "demo-app-id" : undefined),
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

if (usingEmulators) {
  const globalWithEmulators = globalThis as { __firebaseEmulatorsConnected?: boolean };

  if (!globalWithEmulators.__firebaseEmulatorsConnected) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    globalWithEmulators.__firebaseEmulatorsConnected = true;
  }
}
