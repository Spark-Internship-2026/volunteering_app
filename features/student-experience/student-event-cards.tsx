"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import {
  signupButtonClass,
  signupButtonLabel,
} from "@/features/student-experience/signup-button";
import {
  formatHours,
  formatOpportunityDate,
  type Opportunity,
} from "@/lib/opportunities";

function handleOpenDetailsKeyDown(
  event: ReactKeyboardEvent<HTMLDivElement>,
  onOpenDetails: () => void,
) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpenDetails();
  }
}

type ActiveEventCardProps = {
  opportunity: Opportunity;
  isSignedUp: boolean;
  isSubmitting: boolean;
  isRemoving: boolean;
  onOpenDetails: () => void;
  onToggleSignup: () => void;
};

// An upcoming event in the student's "Available Events" list.
export function ActiveEventCard({
  opportunity,
  isSignedUp,
  isSubmitting,
  isRemoving,
  onOpenDetails,
  onToggleSignup,
}: ActiveEventCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div
          className="min-w-0 flex-1 cursor-pointer rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
          onClick={onOpenDetails}
          onKeyDown={(event) => handleOpenDetailsKeyDown(event, onOpenDetails)}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-base font-semibold">{opportunity.title}</h3>
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
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {opportunity.description}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-medium text-blue-700">View details</p>
        </div>

        <button
          className={signupButtonClass(
            isSignedUp,
            "inline-flex h-10 min-w-32 shrink-0 items-center justify-center",
          )}
          disabled={isSubmitting || isRemoving}
          onClick={onToggleSignup}
          type="button"
        >
          {signupButtonLabel(isSignedUp, isSubmitting, isRemoving, false)}
        </button>
      </div>
    </article>
  );
}

type PastEventCardProps = {
  opportunity: Opportunity;
  isSignedUp: boolean;
  onOpenDetails: () => void;
};

// A finished event in the student's "Past Events" list, with the staff's notes.
export function PastEventCard({
  opportunity,
  isSignedUp,
  onOpenDetails,
}: PastEventCardProps) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div
          className="min-w-0 flex-1 cursor-pointer rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
          onClick={onOpenDetails}
          onKeyDown={(event) => handleOpenDetailsKeyDown(event, onOpenDetails)}
          role="button"
          tabIndex={0}
        >
          <h3 className="text-base font-semibold">{opportunity.title}</h3>
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
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              {opportunity.description}
            </p>
          ) : null}
          {opportunity.wrapUpSummary ? (
            <div className="mt-4 rounded-md bg-white p-3">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Event notes
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                {opportunity.wrapUpSummary}
              </p>
            </div>
          ) : null}
          {opportunity.videoUrl ? (
            <a
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
              href={opportunity.videoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Watch notes video
            </a>
          ) : null}
          <p className="mt-3 text-sm font-medium text-blue-700">View details</p>
        </div>

        <button
          className={signupButtonClass(
            isSignedUp,
            "inline-flex h-10 min-w-32 shrink-0 items-center justify-center",
          )}
          disabled
          type="button"
        >
          {signupButtonLabel(isSignedUp, false, false, true)}
        </button>
      </div>
    </article>
  );
}
