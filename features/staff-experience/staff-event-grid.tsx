import Link from "next/link";

import {
  formatHours,
  formatOpportunityDate,
  type Opportunity,
} from "@/lib/opportunities";

type StaffEventGridProps = {
  opportunities: Opportunity[];
  isNotesMode: boolean;
};

// A grid of event cards for staff. Each card links to that event's page
// (or straight to its notes section in notes mode).
export function StaffEventGrid({
  opportunities,
  isNotesMode,
}: StaffEventGridProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {opportunities.map((opportunity) => (
        <Link
          className="block rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
          href={`/staff/events/${opportunity.id}${isNotesMode ? "#notes" : ""}`}
          key={opportunity.id}
        >
          <article className="flex h-full flex-col justify-between gap-4">
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
  );
}
