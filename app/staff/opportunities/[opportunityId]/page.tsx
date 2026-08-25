import { OpportunityDetail } from "@/components/opportunity-detail";
import { StaffGate } from "@/components/staff-gate";

export default async function StaffOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  return (
    <StaffGate>
      <OpportunityDetail opportunityId={opportunityId} />
    </StaffGate>
  );
}
