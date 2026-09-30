"use client";

import { FirebaseError } from "firebase/app";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { type FormEvent, useState } from "react";

import { db } from "@/lib/firebase";
import type { Opportunity } from "@/lib/opportunities";

type EventNotesSectionProps = {
  opportunity: Opportunity;
  // Called after the notes are saved so the page can show the new values.
  onSaved: (
    changes: Pick<Opportunity, "wrapUpSummary" | "videoUrl">,
  ) => void;
};

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

// "Notes" on the staff event page: a wrap-up summary and an optional video link
// that students see after the event.
export function EventNotesSection({
  opportunity,
  onSaved,
}: EventNotesSectionProps) {
  const [wrapUpSummary, setWrapUpSummary] = useState(opportunity.wrapUpSummary);
  const [videoUrl, setVideoUrl] = useState(opportunity.videoUrl);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
      await updateDoc(doc(db, "opportunities", opportunity.id), {
        wrapUpSummary: trimmedSummary,
        videoUrl: trimmedVideoUrl,
        updatedAt: serverTimestamp(),
      });

      onSaved({ wrapUpSummary: trimmedSummary, videoUrl: trimmedVideoUrl });
      setSaveMessage("Notes saved.");
    } catch (caughtError) {
      setSaveError(saveErrorMessage(caughtError));
    } finally {
      setIsSaving(false);
    }
  }

  return (
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
  );
}
