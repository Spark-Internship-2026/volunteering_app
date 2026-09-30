import { StaffOpportunitiesList } from "@/features/staff-experience/staff-opportunities-list";
import { StaffGate } from "@/features/staff-experience/staff-gate";

export default function NewNotesPage() {
  return (
    <StaffGate>
      <StaffOpportunitiesList mode="notes" />
    </StaffGate>
  );
}
