export type StaffViewMode = "staff" | "student";

type StaffViewToggleProps = {
  mode: StaffViewMode;
  onChange: (mode: StaffViewMode) => void;
};

function staffToggleButtonClass(isActive: boolean) {
  const baseClassName =
    "inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium transition sm:flex-none";

  if (isActive) {
    return `${baseClassName} bg-blue-700 text-white`;
  }

  return `${baseClassName} text-zinc-700 hover:bg-zinc-100`;
}

// Lets staff switch the dashboard between the staff view and what students see.
export function StaffViewToggle({ mode, onChange }: StaffViewToggleProps) {
  return (
    <div
      aria-label="Dashboard view"
      className="mt-6 flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm sm:w-fit"
      role="group"
    >
      <button
        aria-pressed={mode === "staff"}
        className={staffToggleButtonClass(mode === "staff")}
        onClick={() => onChange("staff")}
        type="button"
      >
        Staff view
      </button>
      <button
        aria-pressed={mode === "student"}
        className={staffToggleButtonClass(mode === "student")}
        onClick={() => onChange("student")}
        type="button"
      >
        Student view
      </button>
    </div>
  );
}
