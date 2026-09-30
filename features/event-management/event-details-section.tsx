"use client";

import { FirebaseError } from "firebase/app";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { type FormEvent, useState } from "react";

import { db } from "@/lib/firebase";
import {
  formatHours,
  formatOpportunityDate,
  signupClosesAtForDate,
  type Opportunity,
} from "@/lib/opportunities";

type EventDetailsSectionProps = {
  opportunity: Opportunity;
  // Called after the details are saved so the page can show the new values.
  onSaved: (
    changes: Pick<
      Opportunity,
      "title" | "description" | "location" | "date" | "hours"
    >,
  ) => void;
};

function saveErrorMessage(error: unknown) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firebase denied this update. Confirm this account has role: staff and the latest rules are published.";
  }

  return "Could not save the notes. Please try again.";
}

function hoursToInput(hours: number | null) {
  return hours === null ? "" : String(hours);
}

// "Details" on the staff event page: shows the event and lets staff edit it.
export function EventDetailsSection({
  opportunity,
  onSaved,
}: EventDetailsSectionProps) {
  const [editTitle, setEditTitle] = useState(opportunity.title);
  const [editDescription, setEditDescription] = useState(
    opportunity.description,
  );
  const [editLocation, setEditLocation] = useState(opportunity.location);
  const [editDate, setEditDate] = useState(opportunity.date);
  const [editHours, setEditHours] = useState(hoursToInput(opportunity.hours));
  const [detailsError, setDetailsError] = useState("");
  const [detailsMessage, setDetailsMessage] = useState("");
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  function handleEditToggle() {
    if (isEditingDetails) {
      setEditTitle(opportunity.title);
      setEditDescription(opportunity.description);
      setEditLocation(opportunity.location);
      setEditDate(opportunity.date);
      setEditHours(hoursToInput(opportunity.hours));
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
      await updateDoc(doc(db, "opportunities", opportunity.id), {
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        date: editDate,
        hours: parsedHours,
        signupClosesAt,
        updatedAt: serverTimestamp(),
      });

      onSaved({
        title: trimmedTitle,
        description: trimmedDescription,
        location: trimmedLocation,
        date: editDate,
        hours: parsedHours,
      });
      setIsEditingDetails(false);
      setDetailsMessage("Details saved.");
    } catch (caughtError) {
      setDetailsError(saveErrorMessage(caughtError));
    } finally {
      setIsSavingDetails(false);
    }
  }

  return (
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
              onChange={(event) => setEditDescription(event.target.value)}
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
              <dd className="mt-1 text-sm">{formatHours(opportunity.hours)}</dd>
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
  );
}
