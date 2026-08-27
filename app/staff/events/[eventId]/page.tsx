import { OpportunityDetail } from "@/components/opportunity-detail";
import { StaffGate } from "@/components/staff-gate";

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
