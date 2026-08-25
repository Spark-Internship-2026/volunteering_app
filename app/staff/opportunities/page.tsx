import { StaffOpportunitiesList } from "@/components/staff-opportunities-list";
import { StaffGate } from "@/components/staff-gate";

export default function StaffOpportunitiesPage() {
  return (
    <StaffGate>
      <StaffOpportunitiesList />
    </StaffGate>
  );
}
