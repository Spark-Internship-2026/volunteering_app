import { redirect } from "next/navigation";

export default async function StaffOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  redirect(`/staff/events/${opportunityId}`);
}
