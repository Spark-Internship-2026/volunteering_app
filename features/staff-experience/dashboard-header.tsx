type DashboardHeaderProps = {
  isSigningOut: boolean;
  onSignOut: () => void;
};

// Title bar of the dashboard, with the Sign out button.
export function DashboardHeader({
  isSigningOut,
  onSignOut,
}: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-blue-700">Spark Volunteering</p>
        <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
      </div>

      <button
        className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
        disabled={isSigningOut}
        onClick={onSignOut}
        type="button"
      >
        {isSigningOut ? "Signing out" : "Sign out"}
      </button>
    </div>
  );
}
