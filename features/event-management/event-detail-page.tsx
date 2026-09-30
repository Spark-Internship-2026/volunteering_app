"use client";

import { FirebaseError } from "firebase/app";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";

import { EventDetailsSection } from "@/features/event-management/event-details-section";
import { EventNotesSection } from "@/features/staff-experience/event-notes-section";
import { OpportunityQrCode } from "@/features/staff-experience/opportunity-qr-code";
import { EventRoster } from "@/features/student-experience/event-roster";
import { db } from "@/lib/firebase";
import { opportunityFromData, type Opportunity } from "@/lib/opportunities";
import { NavigationLinks } from "@/shared/navigation-links";

type OpportunityDetailProps = {
  opportunityId: string;
};

function detailErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this request. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not load this event. Please refresh and try again.";
}

// The staff page for one event (/staff/events/<id>). This file only loads the
// event and lays out the sections. Each section is its own file, owned by one
// team, so teams can change their part without touching this one:
//   Details  -> event-details-section.tsx      (Event Management)
//   Students -> student-experience/event-roster.tsx (Student Experience)
//   Notes    -> staff-experience/event-notes-section.tsx (Staff Experience)
//   QR code  -> staff-experience/opportunity-qr-code.tsx (Staff Experience)
export function OpportunityDetail({ opportunityId }: OpportunityDetailProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunity() {
      try {
        const opportunitySnapshot = await getDoc(
          doc(db, "opportunities", opportunityId),
        );

        if (!opportunitySnapshot.exists()) {
          if (isMounted) {
            setLoadError("This event does not exist.");
          }
          return;
        }

        if (isMounted) {
          setOpportunity(
            opportunityFromData(
              opportunitySnapshot.id,
              opportunitySnapshot.data(),
            ),
          );
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

  // Sections call this after they save, so the page shows the new values.
  const applyChanges = useCallback((changes: Partial<Opportunity>) => {
    setOpportunity((currentOpportunity) =>
      currentOpportunity ? { ...currentOpportunity, ...changes } : currentOpportunity,
    );
  }, []);

  const handleRosterError = useCallback((error: unknown) => {
    setLoadError(detailErrorMessage(error));
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading event...</p>
      </main>
    );
  }

  if (loadError || !opportunity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not open event</h1>
          <p className="mt-2 text-sm leading-6">{loadError}</p>
          <NavigationLinks
            className="mt-5"
            items={[{ href: "/dashboard", label: "Dashboard" }]}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {opportunity.title}
            </h1>
          </div>

          <NavigationLinks
            items={[
              { href: "/dashboard", label: "Dashboard" },
              {
                href: "/staff/events/new",
                label: "Create new event",
                variant: "primary",
              },
            ]}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <EventDetailsSection
              onSaved={applyChanges}
              opportunity={opportunity}
            />
            <EventRoster
              onLoadError={handleRosterError}
              opportunity={opportunity}
            />
            <EventNotesSection
              onSaved={applyChanges}
              opportunity={opportunity}
            />
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
