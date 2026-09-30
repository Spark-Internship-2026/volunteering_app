"use client";

import {
  signupButtonClass,
  signupButtonLabel,
} from "@/features/student-experience/signup-button";
import {
  formatHours,
  formatOpportunityDate,
  type Opportunity,
} from "@/lib/opportunities";

type StudentEventModalProps = {
  opportunity: Opportunity;
  isSignedUp: boolean;
  isPast: boolean;
  isSubmitting: boolean;
  isRemoving: boolean;
  onClose: () => void;
  onToggleSignup: () => void;
};

// The "event details" window that opens when a student clicks an event.
export function StudentEventModal({
  opportunity,
  isSignedUp,
  isPast,
  isSubmitting,
  isRemoving,
  onClose,
  onToggleSignup,
}: StudentEventModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="student-event-details-title"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h3
              className="mt-2 text-xl font-semibold"
              id="student-event-details-title"
            >
              {opportunity.title}
            </h3>
          </div>

          <button
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
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
            <dd className="mt-1 text-sm">{formatHours(opportunity.hours)}</dd>
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
        ) : (
          <p className="mt-5 text-sm text-zinc-600">
            No description has been added yet.
          </p>
        )}

        {isPast && opportunity.wrapUpSummary ? (
          <div className="mt-5 rounded-md bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase text-zinc-500">
              Event notes
            </p>
            <p className="mt-2 text-sm text-zinc-700">
              {opportunity.wrapUpSummary}
            </p>
          </div>
        ) : null}

        {isPast && opportunity.videoUrl ? (
          <a
            className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
            href={opportunity.videoUrl}
            rel="noreferrer"
            target="_blank"
          >
            Watch notes video
          </a>
        ) : null}

        <button
          className={signupButtonClass(
            isSignedUp,
            "mt-5 flex h-11 w-full items-center justify-center",
          )}
          disabled={isPast || isSubmitting || isRemoving}
          onClick={onToggleSignup}
          type="button"
        >
          {signupButtonLabel(isSignedUp, isSubmitting, isRemoving, isPast)}
        </button>
      </section>
    </div>
  );
}
