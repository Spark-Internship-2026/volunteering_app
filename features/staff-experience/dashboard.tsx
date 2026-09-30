"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardHeader } from "@/features/staff-experience/dashboard-header";
import { ProfileCard } from "@/features/staff-experience/profile-card";
import { StaffOpportunitiesList } from "@/features/staff-experience/staff-opportunities-list";
import {
  StaffViewToggle,
  type StaffViewMode,
} from "@/features/staff-experience/staff-view-toggle";
import { StudentOpportunitiesList } from "@/features/student-experience/student-opportunities-list";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/shared/types";

type DashboardProps = {
  initialEventId?: string;
};

function dashboardErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked this profile read. Check that the latest Firestore rules are published.";
  }

  return "Could not load your profile. Please refresh and try again.";
}

// The /dashboard page after login: loads who you are, then shows the student view
// or (for staff) a switch between the staff and student views.
export function Dashboard({ initialEventId = "" }: DashboardProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [staffViewMode, setStaffViewMode] = useState<StaffViewMode>("staff");
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
        <DashboardHeader
          isSigningOut={isSigningOut}
          onSignOut={handleSignOut}
        />

        {error ? (
          <p
            className="mb-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <ProfileCard
          currentUser={currentUser}
          displayName={displayName}
          profile={profile}
          role={role}
        />

        {currentUser && role === "staff" ? (
          <>
            <StaffViewToggle
              mode={staffViewMode}
              onChange={setStaffViewMode}
            />

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
