import { StaffOpportunitiesList } from "@/components/staff-opportunities-list";
import { StaffGate } from "@/components/staff-gate";

export default function NewWrapUpPage() {
  return (
    <StaffGate>
      <StaffOpportunitiesList mode="wrapUps" />
    </StaffGate>
  );
}
