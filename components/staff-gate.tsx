"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";

type GateState = "loading" | "allowed" | "denied" | "error";

function gateErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked the role check. Confirm the latest Firestore rules are published.";
  }

  return "Could not verify staff access. Please refresh and try again.";
}

export function StaffGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<GateState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        const role = snapshot.exists() ? snapshot.data().role : null;
        setState(role === "staff" ? "allowed" : "denied");
      } catch (caughtError) {
        setMessage(gateErrorMessage(caughtError));
        setState("error");
      }
    });
  }, [router]);

  if (state === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Checking staff access...</p>
      </main>
    );
  }

  if (state === "denied") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-blue-700">
            Spark Volunteering
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Staff access required</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            This page is only available to accounts marked as staff.
          </p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-md border border-zinc-300 px-4 text-sm font-medium hover:bg-zinc-100"
            href="/dashboard"
          >
            Back to dashboard
          </Link>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not check access</h1>
          <p className="mt-2 text-sm leading-6">{message}</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
