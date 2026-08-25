import Link from "next/link";

import { StaffGate } from "@/components/staff-gate";

export default function StaffPage() {
  return (
    <StaffGate>
      <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
        <section className="mx-auto w-full max-w-3xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                Spark Volunteering
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Staff</h1>
            </div>

            <Link
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium hover:bg-zinc-100"
              href="/dashboard"
            >
              Dashboard
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href="/staff/opportunities"
            >
              <h2 className="text-lg font-semibold">Opportunities</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Review opportunity details and student signups.
              </p>
            </Link>

            <Link
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href="/staff/opportunities/new"
            >
              <h2 className="text-lg font-semibold">Create Opportunity</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Add a new volunteer opportunity.
              </p>
            </Link>

            <Link
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
              href="/staff/wrap-ups/new"
            >
              <h2 className="text-lg font-semibold">Add Wrap-Up</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Staff-only wrap-up area.
              </p>
            </Link>
          </div>
        </section>
      </main>
    </StaffGate>
  );
}
