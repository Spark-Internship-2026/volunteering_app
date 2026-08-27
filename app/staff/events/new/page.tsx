import { CreateOpportunityForm } from "@/components/create-opportunity-form";
import { StaffGate } from "@/components/staff-gate";

export default function NewEventPage() {
  return (
    <StaffGate>
      <CreateOpportunityForm />
    </StaffGate>
  );
}
