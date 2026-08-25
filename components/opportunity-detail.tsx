"use client";

import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";

import { OpportunityQrCode } from "@/components/opportunity-qr-code";
import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { db } from "@/lib/firebase";

type Signup = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
};

type OpportunityDetailProps = {
  opportunityId: string;
};

function detailErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this request. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not load this opportunity. Please refresh and try again.";
}

function saveErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this update. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not save the wrap-up. Please try again.";
}

function isValidOptionalUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function signupFromData(id: string, data: Record<string, unknown>): Signup {
  const studentId = typeof data.studentId === "string" ? data.studentId : "";

  return {
    id,
    studentId,
    studentName:
      typeof data.studentName === "string" && data.studentName
        ? data.studentName
        : studentId || "Unknown student",
    studentEmail:
      typeof data.studentEmail === "string" && data.studentEmail
        ? data.studentEmail
        : "No email on signup",
  };
}

export function OpportunityDetail({ opportunityId }: OpportunityDetailProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [wrapUpSummary, setWrapUpSummary] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunity() {
      try {
        const opportunitySnapshot = await getDoc(
          doc(db, "opportunities", opportunityId),
        );

        if (!opportunitySnapshot.exists()) {
          if (isMounted) {
            setLoadError("This opportunity does not exist.");
          }
          return;
        }

        const loadedOpportunity = opportunityFromData(
          opportunitySnapshot.id,
          opportunitySnapshot.data(),
        );
        const signupSnapshot = await getDocs(
          query(
            collection(db, "signups"),
            where("opportunityId", "==", opportunityId),
          ),
        );
        const loadedSignups = signupSnapshot.docs.map((signupDoc) =>
          signupFromData(signupDoc.id, signupDoc.data()),
        );

        if (isMounted) {
          setOpportunity(loadedOpportunity);
          setWrapUpSummary(loadedOpportunity.wrapUpSummary);
          setVideoUrl(loadedOpportunity.videoUrl);
          setSignups(loadedSignups);
        }
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(detailErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOpportunity();

    return () => {
      isMounted = false;
    };
  }, [opportunityId]);

  async function handleWrapUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");

    const trimmedSummary = wrapUpSummary.trim();
    const trimmedVideoUrl = videoUrl.trim();

    if (!isValidOptionalUrl(trimmedVideoUrl)) {
      setSaveError("Enter a valid video URL that starts with http or https.");
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, "opportunities", opportunityId), {
        wrapUpSummary: trimmedSummary,
        videoUrl: trimmedVideoUrl,
        updatedAt: serverTimestamp(),
      });

      setOpportunity((currentOpportunity) =>
        currentOpportunity
          ? {
              ...currentOpportunity,
              wrapUpSummary: trimmedSummary,
              videoUrl: trimmedVideoUrl,
            }
          : currentOpportunity,
      );
      setSaveMessage("Wrap-up saved.");
    } catch (caughtError) {
      setSaveError(saveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading opportunity...</p>
      </main>
    );
  }

  if (loadError || !opportunity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not open opportunity</h1>
          <p className="mt-2 text-sm leading-6">{loadError}</p>
          <Link
            className="mt-5 inline-flex h-10 items-center rounded-md border border-red-300 px-4 text-sm font-medium hover:bg-red-100"
            href="/staff/opportunities"
          >
            Back to opportunities
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
              href="/staff/opportunities"
            >
              Opportunities
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">
              {opportunity.title}
            </h1>
          </div>

          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            href="/staff/opportunities/new"
          >
            Create another
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Details</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-medium uppercase text-zinc-500">
                    Date
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatOpportunityDate(opportunity.date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-zinc-500">
                    Hours
                  </dt>
                  <dd className="mt-1 text-sm">
                    {formatHours(opportunity.hours)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase text-zinc-500">
                    Location
                  </dt>
                  <dd className="mt-1 text-sm">
                    {opportunity.location || "No location"}
                  </dd>
                </div>
              </dl>
              {opportunity.description ? (
                <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                  {opportunity.description}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Signed-Up Students</h2>

              {signups.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">
                  No students signed up yet.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-md border border-zinc-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Name</th>
                        <th className="px-3 py-2 font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200">
                      {signups.map((signup) => (
                        <tr key={signup.id}>
                          <td className="px-3 py-2">{signup.studentName}</td>
                          <td className="break-all px-3 py-2">
                            {signup.studentEmail}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              id="wrap-up"
            >
              <h2 className="text-lg font-semibold">Wrap-Up</h2>

              <form className="mt-4 space-y-4" onSubmit={handleWrapUpSubmit}>
                <label className="block text-sm font-medium">
                  Summary
                  <textarea
                    className="mt-1 block min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={wrapUpSummary}
                    onChange={(event) => setWrapUpSummary(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium">
                  Video URL
                  <input
                    className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                  />
                </label>

                {saveError ? (
                  <p
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {saveError}
                  </p>
                ) : null}

                {saveMessage ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {saveMessage}
                  </p>
                ) : null}

                <button
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving" : "Save wrap-up"}
                </button>
              </form>
            </section>
          </div>

          <OpportunityQrCode
            opportunityId={opportunity.id}
            title={opportunity.title}
          />
        </div>
      </section>
    </main>
  );
}
