import { OpportunityDetail } from "@/features/event-management/event-detail-page";
import { StaffGate } from "@/features/staff-experience/staff-gate";

export default async function StaffEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <StaffGate>
      <OpportunityDetail opportunityId={eventId} />
    </StaffGate>
  );
}
