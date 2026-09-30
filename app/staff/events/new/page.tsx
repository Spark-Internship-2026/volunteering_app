import { CreateOpportunityForm } from "@/features/event-management/create-event-form";
import { StaffGate } from "@/features/staff-experience/staff-gate";

export default function NewEventPage() {
  return (
    <StaffGate>
      <CreateOpportunityForm />
    </StaffGate>
  );
}
