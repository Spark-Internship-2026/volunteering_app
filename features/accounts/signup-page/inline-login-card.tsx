"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { type FormEvent, useState } from "react";

import { isValidEmail } from "@/features/accounts/signup-page/is-valid-email";
import { auth } from "@/lib/firebase";

function loginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Could not log in. Please try again.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Could not log in. Please try again.";
  }
}

// The "Log in" box on the public event signup page. After a successful login the
// signup page notices the new user by itself, so nothing else happens here.
export function InlineLoginCard() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const trimmedEmail = loginEmail.trim();

    if (!isValidEmail(trimmedEmail)) {
      setLoginError("Enter a valid email address.");
      setIsLoggingIn(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, trimmedEmail, loginPassword);
    } catch (caughtError) {
      setLoginError(loginErrorMessage(caughtError));
    } finally {
      setIsLoggingIn(false);
    }
  }

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Log in</h2>

      <form className="mt-4 space-y-4" onSubmit={handleLogin}>
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            onChange={(event) => setLoginEmail(event.target.value)}
            required
            type="email"
            value={loginEmail}
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            autoComplete="current-password"
            className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            minLength={6}
            onChange={(event) => setLoginPassword(event.target.value)}
            required
            type="password"
            value={loginPassword}
          />
        </label>

        {loginError ? (
          <p
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {loginError}
          </p>
        ) : null}

        <button
          className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={isLoggingIn}
          type="submit"
        >
          {isLoggingIn ? "Signing in" : "Log in"}
        </button>
      </form>
    </section>
  );
}
