import { Dashboard } from "@/components/dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string | string[] | undefined }>;
}) {
  const { event } = await searchParams;
  const initialEventId = typeof event === "string" ? event : "";

  return <Dashboard initialEventId={initialEventId} />;
}
