"use client";

import { FirebaseError } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

import { NavigationLinks } from "@/components/navigation-links";
import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { db } from "@/lib/firebase";

type ListMode = "opportunities" | "notes";

type StaffOpportunitiesListProps = {
  embedded?: boolean;
  mode?: ListMode;
};

function opportunitiesErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked this read. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not load events. Please refresh and try again.";
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
  embedded = false,
  mode = "opportunities",
}: StaffOpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const isNotesMode = mode === "notes";

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

  const content = (
    <section className={embedded ? "mt-6" : "mx-auto w-full max-w-4xl"}>
      <div className="mb-5 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {embedded ? null : (
            <Link
              className="text-sm font-medium text-blue-700 hover:text-blue-800"
              href="/dashboard"
            >
              Dashboard
            </Link>
          )}
          {embedded ? (
            <h2 className="text-lg font-semibold">
              {isNotesMode ? "Choose Event" : "Events"}
            </h2>
          ) : (
            <h1 className="mt-2 text-2xl font-semibold">
              {isNotesMode ? "Choose Event" : "Events"}
            </h1>
          )}
        </div>

        <NavigationLinks
          items={[
            ...(!embedded ? [{ href: "/dashboard", label: "Dashboard" }] : []),
            ...(!isNotesMode || embedded
              ? []
              : [{ href: "/staff/events", label: "Events" }]),
            {
              href: "/staff/events/new",
              label: "Create new event",
              variant: "primary",
            },
          ]}
        />
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
        <p className="text-sm text-zinc-600">Loading events...</p>
      ) : null}

      {!isLoading && opportunities.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-600">No events yet.</p>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {opportunities.map((opportunity) => (
          <Link
            className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
            href={`/staff/events/${opportunity.id}${
              isNotesMode ? "#notes" : ""
            }`}
            key={opportunity.id}
          >
            <article
              className="flex h-full flex-col justify-between gap-4"
            >
              <div>
                <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
                  <div>
                    <dt className="sr-only">Date</dt>
                    <dd>{formatOpportunityDate(opportunity.date)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Hours</dt>
                    <dd>{formatHours(opportunity.hours)}</dd>
                  </div>
                  {opportunity.location ? (
                    <div>
                      <dt className="sr-only">Location</dt>
                      <dd>{opportunity.location}</dd>
                    </div>
                  ) : null}
                </dl>
                {opportunity.description ? (
                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {opportunity.description}
                  </p>
                ) : null}
              </div>

              <p className="text-sm font-medium text-blue-700">
                {isNotesMode ? "Edit notes" : "View details"}
              </p>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      {content}
    </main>
  );
}
