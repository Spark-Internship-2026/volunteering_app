import { Dashboard } from "@/features/staff-experience/dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] | undefined }>;
}) {
  const { event } = await searchParams;
  const initialEventId = typeof event === "string" ? event : "";

  return <Dashboard initialEventId={initialEventId} />;
}
