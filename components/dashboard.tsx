"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { auth, db } from "@/lib/firebase";
import { StaffOpportunitiesList } from "@/components/staff-opportunities-list";
import { StudentOpportunitiesList } from "@/components/student-opportunities-list";

type UserProfile = {
  name?: string;
  email?: string;
  role?: "student" | "staff";
};

type DashboardProps = {
  initialEventId?: string;
};

type StaffViewMode = "staff" | "student";

function dashboardErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked this profile read. Check that the latest Firestore rules are published.";
  }

  return "Could not load your profile. Please refresh and try again.";
}

function staffToggleButtonClass(isActive: boolean) {
  const baseClassName =
    "inline-flex h-10 flex-1 items-center justify-center rounded-md px-4 text-sm font-medium transition sm:flex-none";

  if (isActive) {
    return `${baseClassName} bg-blue-700 text-white`;
  }

  return `${baseClassName} text-zinc-700 hover:bg-zinc-100`;
}

export function Dashboard({ initialEventId = "" }: DashboardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [staffViewMode, setStaffViewMode] =
    useState<StaffViewMode>("staff");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setCurrentUser(user);

      try {
        const snapshot = await getDoc(doc(db, "users", user.uid));
        setProfile(snapshot.exists() ? (snapshot.data() as UserProfile) : null);
      } catch (caughtError) {
        setError(dashboardErrorMessage(caughtError));
      } finally {
        setIsLoading(false);
      }
    });
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut(auth);
    router.replace("/login");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading dashboard...</p>
      </main>
    );
  }

  const displayName =
    profile?.name ?? currentUser?.displayName ?? currentUser?.email ?? "User";
  const role = profile?.role ?? "student";

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
          </div>

          <button
            className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
            disabled={isSigningOut}
            onClick={handleSignOut}
            type="button"
          >
            {isSigningOut ? "Signing out" : "Sign out"}
          </button>
        </div>

        {error ? (
          <p
            className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Welcome, {displayName}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500">
                Email
              </dt>
              <dd className="mt-1 break-words text-sm">
                {profile?.email ?? currentUser?.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-zinc-500">
                Role
              </dt>
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

        {currentUser && role === "staff" ? (
          <>
            <div
              aria-label="Dashboard view"
              className="mt-6 flex rounded-lg border border-zinc-200 bg-white p-1 shadow-sm sm:w-fit"
              role="group"
            >
              <button
                aria-pressed={staffViewMode === "staff"}
                className={staffToggleButtonClass(staffViewMode === "staff")}
                onClick={() => setStaffViewMode("staff")}
                type="button"
              >
                Staff view
              </button>
              <button
                aria-pressed={staffViewMode === "student"}
                className={staffToggleButtonClass(
                  staffViewMode === "student",
                )}
                onClick={() => setStaffViewMode("student")}
                type="button"
              >
                Student view
              </button>
            </div>

            {staffViewMode === "staff" ? (
              <StaffOpportunitiesList embedded />
            ) : (
              <StudentOpportunitiesList
                currentUser={currentUser}
                initialEventId={initialEventId}
                profile={profile}
              />
            )}
          </>
        ) : null}

        {currentUser && role === "student" ? (
          <StudentOpportunitiesList
            currentUser={currentUser}
            initialEventId={initialEventId}
            profile={profile}
          />
        ) : null}
      </section>
    </main>
  );
}
