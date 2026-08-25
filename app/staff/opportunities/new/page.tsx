import { CreateOpportunityForm } from "@/components/create-opportunity-form";
import { StaffGate } from "@/components/staff-gate";

export default function NewOpportunityPage() {
  return (
    <StaffGate>
      <CreateOpportunityForm />
    </StaffGate>
  );
}
