"use client";

import { FirebaseError } from "firebase/app";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { auth, db } from "@/lib/firebase";

function opportunityErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this write. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not create the opportunity. Please try again.";
}

export function CreateOpportunityForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedTitle = title.trim();
    const parsedHours = Number(hours);

    if (!trimmedTitle) {
      setError("Enter a title.");
      return;
    }

    if (!hours || Number.isNaN(parsedHours) || parsedHours <= 0) {
      setError("Enter the number of service hours.");
      return;
    }

    if (!date) {
      setError("Choose a date.");
      return;
    }

    setIsSubmitting(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        setError("Log in again before creating an opportunity.");
        return;
      }

      const opportunity = await addDoc(collection(db, "opportunities"), {
        title: trimmedTitle,
        description: description.trim(),
        location: location.trim(),
        hours: parsedHours,
        date,
        wrapUpSummary: "",
        videoUrl: "",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      router.push(`/staff/opportunities/${opportunity.id}`);
    } catch (caughtError) {
      setError(opportunityErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-2xl">
        <div className="mb-6 border-b border-zinc-200 pb-5">
          <Link
            className="text-sm font-medium text-blue-700 hover:text-blue-800"
            href="/staff"
          >
            Staff
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">Create Opportunity</h1>
        </div>

        <form
          className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div className="space-y-4">
            <label className="block text-sm font-medium">
              Title
              <input
                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Date
                <input
                  className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </label>

              <label className="block text-sm font-medium">
                Hours
                <input
                  className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  min="0.25"
                  step="0.25"
                  type="number"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  required
                />
              </label>
            </div>

            <label className="block text-sm font-medium">
              Description
              <textarea
                className="mt-1 block min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium">
              Location
              <input
                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </label>
          </div>

          {error ? (
            <p
              className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            className="mt-5 flex h-11 w-full items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Creating" : "Create opportunity"}
          </button>
        </form>
      </section>
    </main>
  );
}
