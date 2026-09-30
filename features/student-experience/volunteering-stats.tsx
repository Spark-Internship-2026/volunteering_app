import { formatHours } from "@/lib/opportunities";

type VolunteeringStatsProps = {
  totalHours: number;
  eventsJoined: number;
};

// "Your Volunteering": the student's total hours and number of events joined.
export function VolunteeringStats({
  totalHours,
  eventsJoined,
}: VolunteeringStatsProps) {
  return (
    <>
      <h2 className="text-lg font-semibold">Your Volunteering</h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">Total Hours</p>
          <p className="mt-2 text-3xl font-semibold text-blue-950">
            {formatHours(totalHours)}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-600">Events Joined</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-950">
            {eventsJoined}
          </p>
        </div>
      </div>
    </>
  );
}
