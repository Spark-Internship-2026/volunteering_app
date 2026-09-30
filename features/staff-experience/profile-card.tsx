import type { User } from "firebase/auth";

import type { UserProfile } from "@/shared/types";

type ProfileCardProps = {
  displayName: string;
  profile: UserProfile | null;
  currentUser: User | null;
  role: string;
};

// "Welcome, <name>" box with the signed-in user's email, role and id.
export function ProfileCard({
  displayName,
  profile,
  currentUser,
  role,
}: ProfileCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Welcome, {displayName}</h2>
      <dl className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Email</dt>
          <dd className="mt-1 break-words text-sm">
            {profile?.email ?? currentUser?.email}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">Role</dt>
          <dd className="mt-1 text-sm capitalize">{role}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-zinc-500">
            User ID
          </dt>
          <dd className="mt-1 break-all font-mono text-xs">
            {currentUser?.uid}
          </dd>
        </div>
      </dl>
    </div>
  );
}
