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
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useState,
} from "react";

import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  type Opportunity,
} from "@/lib/opportunities";
import { db } from "@/lib/firebase";

type UserProfile = {
  name?: string;
  email?: string;
  role?: "student" | "staff";
};

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
    return "Firebase denied this signup. Confirm your user doc has role: student and the latest rules are published.";
  }

  return "Could not sign up. Please try again.";
}

function removeSignupErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this removal. Confirm this is your signup and the latest rules are published.";
  }

  return "Could not remove signup. Please try again.";
}

function signupButtonClass(isSignedUp: boolean, className: string) {
  return `${className} rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 ${
    isSignedUp
      ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
      : "bg-blue-700 text-white hover:bg-blue-800"
  }`;
}

function signupButtonLabel(
  isSignedUp: boolean,
  isSubmitting: boolean,
  isRemoving: boolean,
) {
  if (isSignedUp) {
    return isRemoving ? "Removing" : "Remove signup";
  }

  return isSubmitting ? "Signing up" : "Sign up";
}

function sortOpportunities(opportunities: Opportunity[]) {
  return [...opportunities].sort((first, second) => {
    if (!first.date) {
      return 1;
    }

    if (!second.date) {
      return -1;
    }

    return first.date.localeCompare(second.date);
  });
}

export function StudentOpportunitiesList({
  currentUser,
  initialEventId = "",
  profile,
}: StudentOpportunitiesListProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [signedUpOpportunityIds, setSignedUpOpportunityIds] = useState<
    Set<string>
  >(new Set());
  const [signupDocIdsByOpportunityId, setSignupDocIdsByOpportunityId] =
    useState<Map<string, string>>(new Map());
  const [submittingOpportunityId, setSubmittingOpportunityId] = useState("");
  const [removingOpportunityId, setRemovingOpportunityId] = useState("");
  const [selectedOpportunityId, setSelectedOpportunityId] =
    useState(initialEventId);
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

        const loadedOpportunities = sortOpportunities(
          opportunitySnapshot.docs.map((opportunityDoc) =>
            opportunityFromData(opportunityDoc.id, opportunityDoc.data()),
          ),
        );
        const loadedSignupIds = new Set<string>();
        const loadedSignupDocIdsByOpportunityId = new Map<string, string>();

        signupSnapshot.docs.forEach((signupDoc) => {
          const opportunityId = signupDoc.data().opportunityId;

          if (typeof opportunityId === "string") {
            loadedSignupIds.add(opportunityId);
            loadedSignupDocIdsByOpportunityId.set(opportunityId, signupDoc.id);
          }
        });

        if (isMounted) {
          setOpportunities(loadedOpportunities);
          setSignedUpOpportunityIds(loadedSignupIds);
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

  async function handleSignup(opportunity: Opportunity) {
    setError("");
    setMessage("");

    if (profile?.role !== "student") {
      setError("This account needs role: student before it can sign up.");
      return;
    }

    const studentEmail = currentUser.email ?? profile.email ?? "";
    const studentName =
      profile.name ?? currentUser.displayName ?? studentEmail ?? "Student";

    setSubmittingOpportunityId(opportunity.id);

    try {
      const signupDocId = `${currentUser.uid}_${opportunity.id}`;

      await setDoc(doc(db, "signups", signupDocId), {
        studentId: currentUser.uid,
        studentName,
        studentEmail,
        opportunityId: opportunity.id,
        createdAt: serverTimestamp(),
      });

      setSignedUpOpportunityIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(opportunity.id);
        return nextIds;
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

    if (profile?.role !== "student") {
      setError("This account needs role: student before it can remove a signup.");
      return;
    }

    const signupDocId =
      signupDocIdsByOpportunityId.get(opportunity.id) ??
      `${currentUser.uid}_${opportunity.id}`;

    setRemovingOpportunityId(opportunity.id);

    try {
      await deleteDoc(doc(db, "signups", signupDocId));

      setSignedUpOpportunityIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(opportunity.id);
        return nextIds;
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

  function handleOpenDetailsKeyDown(
    event: ReactKeyboardEvent<HTMLDivElement>,
    opportunity: Opportunity,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedOpportunityId(opportunity.id);
    }
  }

  const signedUpOpportunities = opportunities.filter((opportunity) =>
    signedUpOpportunityIds.has(opportunity.id),
  );

  const totalHours = signedUpOpportunities.reduce(
    (sum, opportunity) => sum + (opportunity.hours ?? 0),
    0,
  );
  const today = new Date();
today.setHours(0, 0, 0, 0);

const opportunityHistory = signedUpOpportunities.filter((opportunity) => {
  const opportunityDate = new Date(`${opportunity.date}T00:00:00`);

  return (
    !Number.isNaN(opportunityDate.getTime()) && opportunityDate < today
  );
});

  const selectedOpportunityIsSignedUp = selectedOpportunity
    ? signedUpOpportunityIds.has(selectedOpportunity.id)
    : false;
  const selectedOpportunityIsSubmitting =
    selectedOpportunity?.id === submittingOpportunityId;
  const selectedOpportunityIsRemoving =
    selectedOpportunity?.id === removingOpportunityId;

  return (
    <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
  <h2 className="text-lg font-semibold">Your Volunteering</h2>

  <div className="mt-4 grid gap-4 sm:grid-cols-2">
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
      <p className="text-sm font-medium text-blue-700">Total Hours</p>
      <p className="mt-2 text-3xl font-semibold text-blue-950">
        {formatHours(totalHours)}
      </p>
    </div>

    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-600">Events Joined</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-950">
        {signedUpOpportunities.length}
      </p>
    </div>
  </div>

  <div className="mt-8">
  <h2 className="text-lg font-semibold">Opportunity History</h2>

  {opportunityHistory.length === 0 ? (
    <p className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
      No past opportunities yet.
    </p>
  ) : (
    <div className="mt-4 space-y-3">
      {opportunityHistory.map((opportunity) => (
        <article
          className="rounded-lg border border-zinc-200 p-4"
          key={opportunity.id}
        >
          <h3 className="font-semibold">{opportunity.title}</h3>

          <div className="mt-2 flex gap-5 text-sm text-zinc-600">
            <span>{formatOpportunityDate(opportunity.date)}</span>
            <span>{formatHours(opportunity.hours)}</span>
          </div>

          {opportunity.wrapUpSummary ? (
            <div className="mt-4 rounded-md bg-zinc-50 p-3">
              <p className="text-xs font-medium uppercase text-zinc-500">
                Event wrap-up
              </p>
              <p className="mt-2 text-sm text-zinc-700">
                {opportunity.wrapUpSummary}
              </p>
            </div>
          ) : null}

          {opportunity.videoUrl ? (
            <a
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
              href={opportunity.videoUrl}
              rel="noreferrer"
              target="_blank"
            >
              Watch wrap-up video
            </a>
          ) : null}
        </article>
      ))}
    </div>
  )}
</div>

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

      {!isLoading && opportunities.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">
          No events have been posted yet.
        </p>
      ) : null}

      <div className="mt-4 space-y-3">
        {opportunities.map((opportunity) => {
          const isSignedUp = signedUpOpportunityIds.has(opportunity.id);
          const isSubmitting = submittingOpportunityId === opportunity.id;
          const isRemoving = removingOpportunityId === opportunity.id;

          return (
            <article
              className="rounded-lg border border-zinc-200 p-4"
              key={opportunity.id}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div
                  className="min-w-0 flex-1 cursor-pointer rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-blue-200"
                  onClick={() => setSelectedOpportunityId(opportunity.id)}
                  onKeyDown={(event) =>
                    handleOpenDetailsKeyDown(event, opportunity)
                  }
                  role="button"
                  tabIndex={0}
                >
                  <h3 className="text-base font-semibold">
                    {opportunity.title}
                  </h3>
                  <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-600">
                    <div>
                      <dt className="sr-only">Date</dt>
                      <dd>{formatOpportunityDate(opportunity.date)}</dd>
                    </div>
                    <div>
                      <dt className="sr-only">Hours</dt>
                      <dd>{formatHours(opportunity.hours)}</dd>
                    </div>
                    {opportunity.location ? (
                      <div>
                        <dt className="sr-only">Location</dt>
                        <dd>{opportunity.location}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {opportunity.description ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {opportunity.description}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm font-medium text-blue-700">
                    View details
                  </p>
                </div>

                <button
                  className={signupButtonClass(
                    isSignedUp,
                    "inline-flex h-10 min-w-32 shrink-0 items-center justify-center",
                  )}
                  disabled={isSubmitting || isRemoving}
                  onClick={() =>
                    isSignedUp
                      ? handleRemoveSignup(opportunity)
                      : handleSignup(opportunity)
                  }
                  type="button"
                >
                  {signupButtonLabel(isSignedUp, isSubmitting, isRemoving)}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selectedOpportunity ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
          onClick={() => setSelectedOpportunityId("")}
          role="presentation"
        >
          <section
            aria-labelledby="student-event-details-title"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-blue-700">
                  Spark Volunteering
                </p>
                <h3
                  className="mt-2 text-xl font-semibold"
                  id="student-event-details-title"
                >
                  {selectedOpportunity.title}
                </h3>
              </div>

              <button
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 px-3 text-sm font-medium transition hover:bg-zinc-100"
                onClick={() => setSelectedOpportunityId("")}
                type="button"
              >
                Close
              </button>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Date
                </dt>
                <dd className="mt-1 text-sm">
                  {formatOpportunityDate(selectedOpportunity.date)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Hours
                </dt>
                <dd className="mt-1 text-sm">
                  {formatHours(selectedOpportunity.hours)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase text-zinc-500">
                  Location
                </dt>
                <dd className="mt-1 text-sm">
                  {selectedOpportunity.location || "No location"}
                </dd>
              </div>
            </dl>

            {selectedOpportunity.description ? (
              <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                {selectedOpportunity.description}
              </p>
            ) : (
              <p className="mt-5 text-sm text-zinc-600">
                No description has been added yet.
              </p>
            )}

            <button
              className={signupButtonClass(
                selectedOpportunityIsSignedUp,
                "mt-5 flex h-11 w-full items-center justify-center",
              )}
              disabled={
                selectedOpportunityIsSubmitting || selectedOpportunityIsRemoving
              }
              onClick={() =>
                selectedOpportunityIsSignedUp
                  ? handleRemoveSignup(selectedOpportunity)
                  : handleSignup(selectedOpportunity)
              }
              type="button"
            >
              {signupButtonLabel(
                selectedOpportunityIsSignedUp,
                selectedOpportunityIsSubmitting,
                selectedOpportunityIsRemoving,
              )}
            </button>
          </section>
        </div>
      ) : null}
    </section>
  );
}
