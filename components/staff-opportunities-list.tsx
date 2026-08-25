"use client";

import { FirebaseError } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { db } from "@/lib/firebase";

type ListMode = "opportunities" | "wrapUps";

type StaffOpportunitiesListProps = {
  mode?: ListMode;
};

function opportunitiesErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked this read. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not load opportunities. Please refresh and try again.";
}

function sortOpportunities(opportunities: Opportunity[]) {
  return [...opportunities].sort((first, second) => {
    if (!first.date) {
      return 1;
    }

    if (!second.date) {
      return -1;
    }

    return first.date.localeCompare(second.date);
  });
}

export function StaffOpportunitiesList({
  mode = "opportunities",
}: StaffOpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const isWrapUpMode = mode === "wrapUps";

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunities() {
      try {
        const snapshot = await getDocs(collection(db, "opportunities"));
        const loadedOpportunities = sortOpportunities(
          snapshot.docs.map((opportunityDoc) =>
            opportunityFromData(opportunityDoc.id, opportunityDoc.data()),
          ),
        );

        if (isMounted) {
          setOpportunities(loadedOpportunities);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(opportunitiesErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
              href="/staff"
            >
              Staff
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">
              {isWrapUpMode ? "Add Wrap-Up" : "Opportunities"}
            </h1>
          </div>

          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800"
            href="/staff/opportunities/new"
          >
            Create opportunity
          </Link>
        </div>

        {error ? (
          <p
            className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <p className="text-sm text-zinc-600">Loading opportunities...</p>
        ) : null}

        {!isLoading && opportunities.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-600">No opportunities yet.</p>
          </div>
        ) : null}

        <div className="space-y-3">
          {opportunities.map((opportunity) => (
            <article
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              key={opportunity.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">
                    {opportunity.title}
                  </h2>
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
                    <div>
                      <dt className="sr-only">Date</dt>
                      <dd>{formatOpportunityDate(opportunity.date)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Hours</dt>
                      <dd>{formatHours(opportunity.hours)}</dd>
                    </div>
                  </dl>
                </div>

                <Link
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium transition hover:bg-zinc-100"
                  href={`/staff/opportunities/${opportunity.id}${
                    isWrapUpMode ? "#wrap-up" : ""
                  }`}
                >
                  {isWrapUpMode ? "Edit wrap-up" : "View"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
