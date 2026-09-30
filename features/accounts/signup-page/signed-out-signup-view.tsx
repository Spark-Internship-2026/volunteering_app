"use client";

import { EventSummaryCard } from "@/features/event-management/event-summary-card";
import { GuestSignupCard } from "@/features/accounts/signup-page/guest-signup-card";
import { InlineLoginCard } from "@/features/accounts/signup-page/inline-login-card";
import type { Opportunity } from "@/lib/opportunities";

type SignedOutSignupViewProps = {
  opportunity: Opportunity | null;
  opportunityId: string;
};

// What a visitor who is not logged in sees at /signup/<event id>: the event, plus
// two ways to continue (guest signup or log in). Add new cards to the grid.
export function SignedOutSignupView({
  opportunity,
  opportunityId,
}: SignedOutSignupViewProps) {
  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-6 border-b border-zinc-200 pb-5">
          <p className="text-sm font-medium text-blue-700">
            Spark Volunteering
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Event Sign-Up</h1>
        </div>

        {opportunity ? <EventSummaryCard opportunity={opportunity} /> : null}

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <GuestSignupCard
            opportunity={opportunity}
            opportunityId={opportunityId}
          />
          <InlineLoginCard />
        </div>
      </section>
    </main>
  );
}
