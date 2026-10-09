"use client";

import { FirebaseError } from "firebase/app";
import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  ActiveEventCard,
  PastEventCard,
} from "@/features/student-experience/student-event-cards";
import { StudentEventModal } from "@/features/student-experience/student-event-modal";
import { VolunteeringStats } from "@/features/student-experience/volunteering-stats";
import { db } from "@/lib/firebase";
import {
  getLocalDateKey,
  isOpportunityPast,
  isOpportunityUpcoming,
  opportunityFromData,
  sortOpportunitiesByDate,
  type Opportunity,
} from "@/lib/opportunities";
import {
  normalizeSignupEmail,
  signupDocIdForEmail,
  signupStageFor,
  signupStatusFromData,
  type SignupStatus,
} from "@/lib/signups";
import type { UserProfile } from "@/shared/types";

type StudentOpportunitiesListProps = {
  currentUser: User;
  initialEventId?: string;
  profile: UserProfile | null;
};

function opportunitiesErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase blocked this read. Confirm the latest Firestore rules are published.";
  }

  return "Could not load events. Please refresh and try again.";
}

function signupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this signup. Confirm your user doc has role: student or staff and the latest rules are published.";
  }

  return "Could not sign up. Please try again.";
}

function removeSignupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this removal. Confirm this is your signup and the latest rules are published.";
  }

  return "Could not remove signup. Please try again.";
}

function canUseStudentSignup(profile: UserProfile | null) {
  return profile?.role === "student" || profile?.role === "staff";
}

function signupEmailForUser(currentUser: User, profile: UserProfile | null) {
  return normalizeSignupEmail(currentUser.email ?? profile?.email ?? "");
}

// The student's home screen content: totals, upcoming events, past events and the
// event details window. This file loads the data and handles signing up and
// removing a signup; how things look lives in the neighbouring files.
export function StudentOpportunitiesList({
  currentUser,
  initialEventId = "",
  profile,
}: StudentOpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [signupStatusByOpportunityId, setSignupStatusByOpportunityId] =
    useState<Map<string, SignupStatus>>(new Map());
  const [signupDocIdsByOpportunityId, setSignupDocIdsByOpportunityId] =
    useState<Map<string, string>>(new Map());
  const [submittingOpportunityId, setSubmittingOpportunityId] = useState("");
  const [removingOpportunityId, setRemovingOpportunityId] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] =
    useState(initialEventId);
  const [todayDateKey, setTodayDateKey] = useState(getLocalDateKey);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const selectedOpportunity = selectedOpportunityId
    ? opportunities.find(
        (opportunity) => opportunity.id === selectedOpportunityId,
      )
    : null;

  useEffect(() => {
    let isMounted = true;

    async function loadOpportunities() {
      try {
        const [opportunitySnapshot, signupSnapshot] = await Promise.all([
          getDocs(collection(db, "opportunities")),
          getDocs(
            query(
              collection(db, "signups"),
              where("studentId", "==", currentUser.uid),
            ),
          ),
        ]);

        const loadedOpportunities = sortOpportunitiesByDate(
          opportunitySnapshot.docs.map((opportunityDoc) =>
            opportunityFromData(opportunityDoc.id, opportunityDoc.data()),
          ),
        );
        const loadedStatuses = new Map<string, SignupStatus>();
        const loadedSignupDocIdsByOpportunityId = new Map<string, string>();

        signupSnapshot.docs.forEach((signupDoc) => {
          const signupData = signupDoc.data();
          const opportunityId = signupData.opportunityId;

          if (typeof opportunityId === "string") {
            loadedStatuses.set(
              opportunityId,
              signupStatusFromData(signupData.status),
            );
            loadedSignupDocIdsByOpportunityId.set(opportunityId, signupDoc.id);
          }
        });

        if (isMounted) {
          setOpportunities(loadedOpportunities);
          setSignupStatusByOpportunityId(loadedStatuses);
          setSignupDocIdsByOpportunityId(loadedSignupDocIdsByOpportunityId);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(opportunitiesErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOpportunities();

    return () => {
      isMounted = false;
    };
  }, [currentUser.uid]);

  useEffect(() => {
    if (!selectedOpportunity) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedOpportunityId("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedOpportunity]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setTodayDateKey(getLocalDateKey());
    }, 60_000);

    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  async function handleSignup(opportunity: Opportunity) {
    setError("");
    setMessage("");

    if (isOpportunityPast(opportunity.date, todayDateKey)) {
      setError("This event has passed, so signups are closed.");
      return;
    }

    if (!canUseStudentSignup(profile)) {
      setError("This account needs role: student or staff before it can sign up.");
      return;
    }

    const studentEmail = signupEmailForUser(currentUser, profile);

    if (!studentEmail) {
      setError("This account needs an email address before it can sign up.");
      return;
    }

    const studentName =
      profile?.name ?? currentUser.displayName ?? studentEmail ?? "Student";

    setSubmittingOpportunityId(opportunity.id);

    try {
      const signupDocId = signupDocIdForEmail(opportunity.id, studentEmail);

      await setDoc(doc(db, "signups", signupDocId), {
        studentId: currentUser.uid,
        studentName,
        studentEmail,
        opportunityId: opportunity.id,
        createdAt: serverTimestamp(),
      });

      // `status` is deliberately not written: the rules only let staff set it, and a
      // new signup reads as "signed_up" by default.
      setSignupStatusByOpportunityId((currentStatuses) => {
        const nextStatuses = new Map(currentStatuses);
        nextStatuses.set(opportunity.id, "signed_up");
        return nextStatuses;
      });
      setSignupDocIdsByOpportunityId((currentDocIds) => {
        const nextDocIds = new Map(currentDocIds);
        nextDocIds.set(opportunity.id, signupDocId);
        return nextDocIds;
      });
      setMessage(`Signed up for ${opportunity.title}.`);
    } catch (caughtError) {
      setError(signupErrorMessage(caughtError));
    } finally {
      setSubmittingOpportunityId("");
    }
  }

  async function handleRemoveSignup(opportunity: Opportunity) {
    setError("");
    setMessage("");

    if (isOpportunityPast(opportunity.date, todayDateKey)) {
      setError("This event has passed, so signup changes are closed.");
      return;
    }

    if (!canUseStudentSignup(profile)) {
      setError(
        "This account needs role: student or staff before it can remove a signup.",
      );
      return;
    }

    const signupDocId =
      signupDocIdsByOpportunityId.get(opportunity.id) ??
      signupDocIdForEmail(
        opportunity.id,
        signupEmailForUser(currentUser, profile),
      );

    setRemovingOpportunityId(opportunity.id);

    try {
      await deleteDoc(doc(db, "signups", signupDocId));

      setSignupStatusByOpportunityId((currentStatuses) => {
        const nextStatuses = new Map(currentStatuses);
        nextStatuses.delete(opportunity.id);
        return nextStatuses;
      });
      setSignupDocIdsByOpportunityId((currentDocIds) => {
        const nextDocIds = new Map(currentDocIds);
        nextDocIds.delete(opportunity.id);
        return nextDocIds;
      });
      setMessage(`Removed signup for ${opportunity.title}.`);
    } catch (caughtError) {
      setError(removeSignupErrorMessage(caughtError));
    } finally {
      setRemovingOpportunityId("");
    }
  }

  function toggleSignup(opportunity: Opportunity, isSignedUp: boolean) {
    if (isSignedUp) {
      handleRemoveSignup(opportunity);
    } else {
      handleSignup(opportunity);
    }
  }

  const signedUpOpportunities = opportunities.filter((opportunity) =>
    signupStatusByOpportunityId.has(opportunity.id),
  );
  const activeOpportunities = opportunities.filter(
    (opportunity) => !isOpportunityPast(opportunity.date, todayDateKey),
  );
  const pastOpportunities = opportunities.filter((opportunity) =>
    isOpportunityPast(opportunity.date, todayDateKey),
  );

  const totalHours = signedUpOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.hours ?? 0),
    0,
  );

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <VolunteeringStats
        eventsJoined={signedUpOpportunities.length}
        totalHours={totalHours}
      />

      <h2 className="mt-8 text-lg font-semibold">Available Events</h2>

      {error ? (
        <p
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {message ? (
        <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {message}
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-sm text-zinc-600">Loading events...</p>
      ) : null}

      {!isLoading && activeOpportunities.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          No available events right now.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {activeOpportunities.map((opportunity) => {
          const signupStatus = signupStatusByOpportunityId.get(opportunity.id);

          return (
            <ActiveEventCard
              isRemoving={removingOpportunityId === opportunity.id}
              isSignedUp={Boolean(signupStatus)}
              isSubmitting={submittingOpportunityId === opportunity.id}
              isUpcoming={isOpportunityUpcoming(opportunity.date, todayDateKey)}
              key={opportunity.id}
              onOpenDetails={() => setSelectedOpportunityId(opportunity.id)}
              onToggleSignup={() =>
                toggleSignup(opportunity, Boolean(signupStatus))
              }
              opportunity={opportunity}
              signupStage={signupStageFor(
                signupStatus,
                opportunity.date,
                todayDateKey,
              )}
            />
          );
        })}
      </div>

      <h2 className="mt-8 text-lg font-semibold">Past Events</h2>

      {!isLoading && pastOpportunities.length === 0 ? (
        <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          No past events yet.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {pastOpportunities.map((opportunity) => (
          <PastEventCard
            isSignedUp={signupStatusByOpportunityId.has(opportunity.id)}
            key={opportunity.id}
            onOpenDetails={() => setSelectedOpportunityId(opportunity.id)}
            opportunity={opportunity}
            signupStage={signupStageFor(
              signupStatusByOpportunityId.get(opportunity.id),
              opportunity.date,
              todayDateKey,
            )}
          />
        ))}
      </div>

      {selectedOpportunity ? (
        <StudentEventModal
          isPast={isOpportunityPast(selectedOpportunity.date, todayDateKey)}
          isRemoving={selectedOpportunity.id === removingOpportunityId}
          isSignedUp={signupStatusByOpportunityId.has(selectedOpportunity.id)}
          isSubmitting={selectedOpportunity.id === submittingOpportunityId}
          onClose={() => setSelectedOpportunityId("")}
          onToggleSignup={() =>
            toggleSignup(
              selectedOpportunity,
              signupStatusByOpportunityId.has(selectedOpportunity.id),
            )
          }
          opportunity={selectedOpportunity}
        />
      ) : null}
    </section>
  );
}
