"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { ThirdPartyLoginButtons } from "@/features/accounts/third-party-login-buttons";
import { auth, db } from "@/lib/firebase";

type AuthMode = "login" | "signup";

type AuthFormProps = {
  mode: AuthMode;
};

function getFriendlyError(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "Something went wrong. Please try again.";
  }

  switch (error.code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Try logging in instead.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "The email or password is incorrect.";
    case "auth/weak-password":
      return "Use a password with at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a bit, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "permission-denied":
      return "Firebase blocked the profile write. Publish the latest Firestore rules, then try again.";
    default:
      return "Could not complete the request. Please try again.";
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim();
      const trimmedName = name.trim();

      if (isSignup && !trimmedName) {
        setError("Enter your name.");
        return;
      }

      if (isSignup) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          trimmedEmail,
          password,
        );

        await updateProfile(credential.user, {
          displayName: trimmedName,
        });

        await setDoc(doc(db, "users", credential.user.uid), {
          name: trimmedName,
          email: credential.user.email ?? trimmedEmail,
          role: "student",
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, trimmedEmail, password);
      }

      router.replace("/dashboard");
    } catch (caughtError) {
      setError(getFriendlyError(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <section className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-blue-700">Spark Volunteering</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {isSignup ? "Create account" : "Log in"}
          </h1>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignup ? (
            <label className="block text-sm font-medium">
              Name
              <input
                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
          ) : null}

          <label className="block text-sm font-medium">
            Email
            <input
              className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <div className="relative mt-1">
              <input
                className="block h-11 w-full rounded-md border border-zinc-300 px-3 pr-10 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                autoComplete={isSignup ? "new-password" : "current-password"}
                minLength={6}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-3 flex items-center text-zinc-500 hover:text-zinc-800"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error ? (
            <p
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting
              ? "Please wait"
              : isSignup
                ? "Create account"
                : "Log in"}
          </button>
        </form>

        <ThirdPartyLoginButtons onSignedIn={() => router.replace("/dashboard")} />

        <p className="mt-5 text-center text-sm text-zinc-600">
          {isSignup ? "Already have an account?" : "Need an account?"}{" "}
          <Link
            className="font-medium text-blue-700 hover:text-blue-800"
            href={isSignup ? "/login" : "/signup"}
          >
            {isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
      </section>
    </main>
  );
}
