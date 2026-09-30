import {
  formatHours,
  formatOpportunityDate,
  type Opportunity,
} from "@/lib/opportunities";

// Read-only summary of an event (title, date, hours, location, description).
export function EventSummaryCard({ opportunity }: { opportunity: Opportunity }) {
  return (
    <article className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">{opportunity.title}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Date</dt>
          <dd className="mt-1 text-sm">
            {formatOpportunityDate(opportunity.date)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Hours</dt>
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
      ) : null}
    </article>
  );
}
