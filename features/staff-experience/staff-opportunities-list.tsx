"use client";

import { FirebaseError } from "firebase/app";
import { collection, getDocs } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";

import { StaffEventGrid } from "@/features/staff-experience/staff-event-grid";
import { db } from "@/lib/firebase";
import {
  getLocalDateKey,
  isOpportunityPast,
  opportunityFromData,
  sortOpportunitiesByDate,
  type Opportunity,
} from "@/lib/opportunities";
import { NavigationLinks } from "@/shared/navigation-links";

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

export function StaffOpportunitiesList({
  embedded = false,
  mode = "opportunities",
}: StaffOpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [todayDateKey, setTodayDateKey] = useState(getLocalDateKey);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const isNotesMode = mode === "notes";

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunities() {
      try {
        const snapshot = await getDocs(collection(db, "opportunities"));
        const loadedOpportunities = sortOpportunitiesByDate(
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

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTodayDateKey(getLocalDateKey());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  const activeOpportunities = opportunities.filter(
    (opportunity) => !isOpportunityPast(opportunity.date, todayDateKey),
  );
  const pastOpportunities = opportunities.filter((opportunity) =>
    isOpportunityPast(opportunity.date, todayDateKey),
  );

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

      {!isLoading && opportunities.length > 0 ? (
        <>
          <h3 className="mb-3 text-base font-semibold">Available Events</h3>
          {activeOpportunities.length === 0 ? (
            <p className="mb-6 rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              No available events right now.
            </p>
          ) : (
            <StaffEventGrid
              isNotesMode={isNotesMode}
              opportunities={activeOpportunities}
            />
          )}

          <h3 className="mb-3 mt-8 text-base font-semibold">Past Events</h3>
          {pastOpportunities.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 shadow-sm">
              No past events yet.
            </p>
          ) : (
            <StaffEventGrid
              isNotesMode={isNotesMode}
              opportunities={pastOpportunities}
            />
          )}
        </>
      ) : null}
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
