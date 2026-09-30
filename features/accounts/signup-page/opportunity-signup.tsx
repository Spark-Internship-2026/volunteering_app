"use client";

import { FirebaseError } from "firebase/app";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SignedOutSignupView } from "@/features/accounts/signup-page/signed-out-signup-view";
import { SignedInSignupPanel } from "@/features/student-experience/signed-in-signup-panel";
import { auth, db } from "@/lib/firebase";
import { opportunityFromData, type Opportunity } from "@/lib/opportunities";
import type { UserProfile } from "@/shared/types";

type OpportunitySignupProps = {
  opportunityId: string;
};

function eventLinkErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this event link. Publish the latest Firestore rules, then try again.";
  }

  return "Could not open this event. Please refresh and try again.";
}

// The page behind an event's QR code (/signup/<event id>). This file only loads
// the event and the user, redirects students and staff to their own pages, and
// picks which view to show. The views themselves live in their own files.
export function OpportunitySignup({ opportunityId }: OpportunitySignupProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) {
        return;
      }

      setCurrentUser(user);
      setError("");
      setIsLoading(true);
      setIsRedirecting(false);

      try {
        const opportunitySnapshot = await getDoc(
          doc(db, "opportunities", opportunityId),
        );

        if (!isMounted) {
          return;
        }

        if (!opportunitySnapshot.exists()) {
          setOpportunity(null);
          setError("This event does not exist.");
          return;
        }

        setOpportunity(
          opportunityFromData(
            opportunitySnapshot.id,
            opportunitySnapshot.data(),
          ),
        );

        if (!user) {
          setProfile(null);
          return;
        }

        const profileSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!isMounted) {
          return;
        }

        const loadedProfile = profileSnapshot.exists()
          ? (profileSnapshot.data() as UserProfile)
          : null;

        setProfile(loadedProfile);

        if (loadedProfile?.role === "staff") {
          setIsRedirecting(true);
          router.replace(`/staff/events/${opportunityId}`);
          return;
        }

        if (loadedProfile?.role === "student") {
          setIsRedirecting(true);
          router.replace(`/dashboard?event=${opportunityId}`);
          return;
        }

        setError("This account does not have a student or staff role yet.");
      } catch (caughtError) {
        if (isMounted) {
          setError(eventLinkErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [opportunityId, router]);

  if (isLoading || isRedirecting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">
          {isRedirecting ? "Opening event..." : "Loading event..."}
        </p>
      </main>
    );
  }

  if (error && !opportunity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not open event</h1>
          <p className="mt-2 text-sm leading-6">{error}</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <SignedOutSignupView
        opportunity={opportunity}
        opportunityId={opportunityId}
      />
    );
  }

  return (
    <SignedInSignupPanel
      currentUser={currentUser}
      initialError={error}
      opportunity={opportunity}
      opportunityId={opportunityId}
      profile={profile}
    />
  );
}
