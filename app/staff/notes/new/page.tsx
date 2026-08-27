import { StaffOpportunitiesList } from "@/components/staff-opportunities-list";
import { StaffGate } from "@/components/staff-gate";

export default function NewNotesPage() {
  return (
    <StaffGate>
      <StaffOpportunitiesList mode="notes" />
    </StaffGate>
  );
}
