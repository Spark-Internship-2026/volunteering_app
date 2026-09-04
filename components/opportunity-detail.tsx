"use client";

import { FirebaseError } from "firebase/app";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { NavigationLinks } from "@/components/navigation-links";
import { OpportunityQrCode } from "@/components/opportunity-qr-code";
import {
  formatHours,
  formatOpportunityDate,
  opportunityFromData,
  signupClosesAtForDate,
  type Opportunity,
} from "@/lib/opportunities";
import { db } from "@/lib/firebase";

type Signup = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  createdAtMillis: number;
};

type OpportunityDetailProps = {
  opportunityId: string;
};

type SignupSortMode = "recent" | "name-asc" | "name-desc";

const signupTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function detailErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this request. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not load this event. Please refresh and try again.";
}

function saveErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this update. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not save the notes. Please try again.";
}

function isValidOptionalUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function timestampToMillis(value: unknown) {
  if (!value || typeof value !== "object") {
    return 0;
  }

  const timestamp = value as { toMillis?: () => number };
  const millis = timestamp.toMillis?.();

  return typeof millis === "number" && Number.isFinite(millis) ? millis : 0;
}

function compareSignupNames(first: Signup, second: Signup) {
  const nameComparison = first.studentName.localeCompare(
    second.studentName,
    "en",
    {
      sensitivity: "base",
    },
  );

  if (nameComparison !== 0) {
    return nameComparison;
  }

  return first.studentEmail.localeCompare(second.studentEmail, "en", {
    sensitivity: "base",
  });
}

function formatSignupTime(createdAtMillis: number) {
  if (!createdAtMillis) {
    return "Unknown";
  }

  return signupTimeFormatter.format(new Date(createdAtMillis));
}

function csvCell(value: string | number | null) {
  const stringValue = value === null ? "" : String(value);

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function csvFileName(opportunity: Opportunity) {
  const titlePart =
    opportunity.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "event";
  const datePart = opportunity.date || "no-date";

  return `${titlePart}-${datePart}-signups.csv`;
}

function signupFromData(id: string, data: Record<string, unknown>): Signup {
  const studentId = typeof data.studentId === "string" ? data.studentId : "";

  return {
    id,
    studentId,
    studentName:
      typeof data.studentName === "string" && data.studentName
        ? data.studentName
        : studentId || "Unknown student",
    studentEmail:
      typeof data.studentEmail === "string" && data.studentEmail
        ? data.studentEmail
        : "No email on signup",
    createdAtMillis: timestampToMillis(data.createdAt),
  };
}

export function OpportunityDetail({ opportunityId }: OpportunityDetailProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editHours, setEditHours] = useState("");
  const [wrapUpSummary, setWrapUpSummary] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [signupSearch, setSignupSearch] = useState("");
  const [signupSortMode, setSignupSortMode] =
    useState<SignupSortMode>("recent");
  const [loadError, setLoadError] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [detailsMessage, setDetailsMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribeSignups: (() => void) | undefined;

    async function loadOpportunity() {
      try {
        const opportunitySnapshot = await getDoc(
          doc(db, "opportunities", opportunityId),
        );

        if (!opportunitySnapshot.exists()) {
          if (isMounted) {
            setLoadError("This event does not exist.");
          }
          return;
        }

        const loadedOpportunity = opportunityFromData(
          opportunitySnapshot.id,
          opportunitySnapshot.data(),
        );

        if (!isMounted) {
          return;
        }

        setOpportunity(loadedOpportunity);
        setEditTitle(loadedOpportunity.title);
        setEditDescription(loadedOpportunity.description);
        setEditLocation(loadedOpportunity.location);
        setEditDate(loadedOpportunity.date);
        setEditHours(
          loadedOpportunity.hours === null
            ? ""
            : String(loadedOpportunity.hours),
        );
        setWrapUpSummary(loadedOpportunity.wrapUpSummary);
        setVideoUrl(loadedOpportunity.videoUrl);

        unsubscribeSignups = onSnapshot(
          query(
            collection(db, "signups"),
            where("opportunityId", "==", opportunityId),
          ),
          (signupSnapshot) => {
            if (isMounted) {
              setSignups(
                signupSnapshot.docs.map((signupDoc) =>
                  signupFromData(signupDoc.id, signupDoc.data()),
                ),
              );
            }
          },
          (caughtError) => {
            if (isMounted) {
              setLoadError(detailErrorMessage(caughtError));
            }
          },
        );
      } catch (caughtError) {
        if (isMounted) {
          setLoadError(detailErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOpportunity();

    return () => {
      isMounted = false;
      unsubscribeSignups?.();
    };
  }, [opportunityId]);

  const visibleSignups = useMemo(() => {
    const normalizedSearch = signupSearch.trim().toLowerCase();
    const filteredSignups = normalizedSearch
      ? signups.filter((signup) => {
          const name = signup.studentName.toLowerCase();
          const email = signup.studentEmail.toLowerCase();

          return (
            name.startsWith(normalizedSearch) ||
            email.startsWith(normalizedSearch)
          );
        })
      : signups;

    return [...filteredSignups].sort((first, second) => {
      if (signupSortMode === "name-asc") {
        return compareSignupNames(first, second);
      }

      if (signupSortMode === "name-desc") {
        return compareSignupNames(second, first);
      }

      const createdAtComparison =
        second.createdAtMillis - first.createdAtMillis;

      return createdAtComparison || compareSignupNames(first, second);
    });
  }, [signups, signupSearch, signupSortMode]);

  function handleExportCsv() {
    if (!opportunity) {
      return;
    }

    const rows = [
      ["Event Title", "Date", "Hours", "Student Name", "Student Email"],
      ...visibleSignups.map((signup) => [
        opportunity.title,
        opportunity.date,
        opportunity.hours,
        signup.studentName,
        signup.studentEmail,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = csvFileName(opportunity);
    link.style.display = "none";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function handleEditToggle() {
    if (isEditingDetails && opportunity) {
      setEditTitle(opportunity.title);
      setEditDescription(opportunity.description);
      setEditLocation(opportunity.location);
      setEditDate(opportunity.date);
      setEditHours(opportunity.hours === null ? "" : String(opportunity.hours));
      setDetailsError("");
      setDetailsMessage("");
    }

    setIsEditingDetails((currentValue) => !currentValue);
  }

  async function handleDetailsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDetailsError("");
    setDetailsMessage("");

    const trimmedTitle = editTitle.trim();
    const trimmedDescription = editDescription.trim();
    const trimmedLocation = editLocation.trim();
    const parsedHours = Number(editHours);

    if (!trimmedTitle) {
      setDetailsError("Enter a title.");
      return;
    }

    if (!editDate) {
      setDetailsError("Choose a date.");
      return;
    }

    if (!editHours || Number.isNaN(parsedHours) || parsedHours <= 0) {
      setDetailsError("Enter the number of service hours.");
      return;
    }

    const signupClosesAt = signupClosesAtForDate(editDate);

    if (!signupClosesAt) {
      setDetailsError("Choose a valid date.");
      return;
    }

    setIsSavingDetails(true);

    try {
      await updateDoc(doc(db, "opportunities", opportunityId), {
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        date: editDate,
        hours: parsedHours,
        signupClosesAt,
        updatedAt: serverTimestamp(),
      });

      setOpportunity((currentOpportunity) =>
        currentOpportunity
          ? {
              ...currentOpportunity,
              title: trimmedTitle,
              description: trimmedDescription,
              location: trimmedLocation,
              date: editDate,
              hours: parsedHours,
            }
          : currentOpportunity,
      );
      setIsEditingDetails(false);
      setDetailsMessage("Details saved.");
    } catch (caughtError) {
      setDetailsError(saveErrorMessage(caughtError));
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function handleWrapUpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    setSaveMessage("");

    const trimmedSummary = wrapUpSummary.trim();
    const trimmedVideoUrl = videoUrl.trim();

    if (!isValidOptionalUrl(trimmedVideoUrl)) {
      setSaveError("Enter a valid video URL that starts with http or https.");
      return;
    }

    setIsSaving(true);

    try {
      await updateDoc(doc(db, "opportunities", opportunityId), {
        wrapUpSummary: trimmedSummary,
        videoUrl: trimmedVideoUrl,
        updatedAt: serverTimestamp(),
      });

      setOpportunity((currentOpportunity) =>
        currentOpportunity
          ? {
              ...currentOpportunity,
              wrapUpSummary: trimmedSummary,
              videoUrl: trimmedVideoUrl,
            }
          : currentOpportunity,
      );
      setSaveMessage("Notes saved.");
    } catch (caughtError) {
      setSaveError(saveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <p className="text-sm text-zinc-600">Loading event...</p>
      </main>
    );
  }

  if (loadError || !opportunity) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 text-zinc-950">
        <section className="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
          <h1 className="text-lg font-semibold">Could not open event</h1>
          <p className="mt-2 text-sm leading-6">{loadError}</p>
          <NavigationLinks
            className="mt-5"
            items={[{ href: "/dashboard", label: "Dashboard" }]}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-950">
      <section className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 border-b border-zinc-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700">
              Spark Volunteering
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {opportunity.title}
            </h1>
          </div>

          <NavigationLinks
            items={[
              { href: "/dashboard", label: "Dashboard" },
              {
                href: "/staff/events/new",
                label: "Create new event",
                variant: "primary",
              },
            ]}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Details</h2>
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 px-4 text-sm font-medium transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-400"
                  disabled={isSavingDetails}
                  onClick={handleEditToggle}
                  type="button"
                >
                  {isEditingDetails ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditingDetails ? (
                <form className="mt-4 space-y-4" onSubmit={handleDetailsSubmit}>
                  <label className="block text-sm font-medium">
                    Title
                    <input
                      className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      required
                    />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium">
                      Date
                      <input
                        className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        type="date"
                        value={editDate}
                        onChange={(event) => setEditDate(event.target.value)}
                        required
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Hours
                      <input
                        className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        min="0.25"
                        step="0.25"
                        type="number"
                        value={editHours}
                        onChange={(event) => setEditHours(event.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-medium">
                    Location
                    <input
                      className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      value={editLocation}
                      onChange={(event) => setEditLocation(event.target.value)}
                    />
                  </label>

                  <label className="block text-sm font-medium">
                    Description
                    <textarea
                      className="mt-1 block min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                      value={editDescription}
                      onChange={(event) =>
                        setEditDescription(event.target.value)
                      }
                    />
                  </label>

                  {detailsError ? (
                    <p
                      className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                      role="alert"
                    >
                      {detailsError}
                    </p>
                  ) : null}

                  <button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    disabled={isSavingDetails}
                    type="submit"
                  >
                    {isSavingDetails ? "Saving" : "Save details"}
                  </button>
                </form>
              ) : (
                <>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-medium uppercase text-zinc-500">
                        Date
                      </dt>
                      <dd className="mt-1 text-sm">
                        {formatOpportunityDate(opportunity.date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-zinc-500">
                        Hours
                      </dt>
                      <dd className="mt-1 text-sm">
                        {formatHours(opportunity.hours)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium uppercase text-zinc-500">
                        Location
                      </dt>
                      <dd className="mt-1 text-sm">
                        {opportunity.location || "No location"}
                      </dd>
                    </div>
                  </dl>
                  {opportunity.description ? (
                    <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-zinc-700">
                      {opportunity.description}
                    </p>
                  ) : null}
                </>
              )}

              {!isEditingDetails && detailsError ? (
                <p
                  className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                  role="alert"
                >
                  {detailsError}
                </p>
              ) : null}

              {!isEditingDetails && detailsMessage ? (
                <p className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {detailsMessage}
                </p>
              ) : null}
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Signed-Up Students</h2>

                {signups.length > 0 ? (
                  <button
                    className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    disabled={visibleSignups.length === 0}
                    onClick={handleExportCsv}
                    type="button"
                  >
                    Export CSV
                  </button>
                ) : null}
              </div>

              {signups.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-600">
                  No students signed up yet.
                </p>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
                    <label className="block text-sm font-medium">
                      Search
                      <input
                        className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        placeholder="Name or email"
                        type="search"
                        value={signupSearch}
                        onChange={(event) =>
                          setSignupSearch(event.target.value)
                        }
                      />
                    </label>

                    <label className="block text-sm font-medium">
                      Sort
                      <select
                        className="mt-1 block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        value={signupSortMode}
                        onChange={(event) =>
                          setSignupSortMode(
                            event.target.value as SignupSortMode,
                          )
                        }
                      >
                        <option value="recent">Time signed up</option>
                        <option value="name-asc">Name A-Z</option>
                        <option value="name-desc">Name Z-A</option>
                      </select>
                    </label>
                  </div>

                  <p className="mt-3 text-sm text-zinc-600">
                    Showing {visibleSignups.length} of {signups.length}
                  </p>

                  {visibleSignups.length === 0 ? (
                    <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                      No students match this search.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto rounded-md border border-zinc-200">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-zinc-100 text-xs uppercase text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Email</th>
                            <th className="whitespace-nowrap px-3 py-2 font-medium">
                              Signed up
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200">
                          {visibleSignups.map((signup) => (
                            <tr key={signup.id}>
                              <td className="px-3 py-2">
                                {signup.studentName}
                              </td>
                              <td className="break-all px-3 py-2">
                                {signup.studentEmail}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                                {formatSignupTime(signup.createdAtMillis)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </section>

            <section
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
              id="notes"
            >
              <h2 className="text-lg font-semibold">Notes</h2>

              <form className="mt-4 space-y-4" onSubmit={handleWrapUpSubmit}>
                <label className="block text-sm font-medium">
                  Summary
                  <textarea
                    className="mt-1 block min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    value={wrapUpSummary}
                    onChange={(event) => setWrapUpSummary(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-medium">
                  Video URL
                  <input
                    className="mt-1 block h-11 w-full rounded-md border border-zinc-300 px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                    type="url"
                    value={videoUrl}
                    onChange={(event) => setVideoUrl(event.target.value)}
                  />
                </label>

                {saveError ? (
                  <p
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    role="alert"
                  >
                    {saveError}
                  </p>
                ) : null}

                {saveMessage ? (
                  <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    {saveMessage}
                  </p>
                ) : null}

                <button
                  className="inline-flex h-10 items-center justify-center rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
                  disabled={isSaving}
                  type="submit"
                >
                  {isSaving ? "Saving" : "Save notes"}
                </button>
              </form>
            </section>
          </div>

          <OpportunityQrCode
            opportunityId={opportunity.id}
            title={opportunity.title}
          />
        </div>
      </section>
    </main>
  );
}
