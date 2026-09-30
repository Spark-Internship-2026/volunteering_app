"use client";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { db } from "@/lib/firebase";
import type { Opportunity } from "@/lib/opportunities";

type Signup = {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  createdAtMillis: number;
};

type SignupSortMode = "recent" | "name-asc" | "name-desc";

type EventRosterProps = {
  opportunity: Opportunity;
  // Called if the list of signups cannot be loaded.
  onLoadError: (error: unknown) => void;
};

const signupTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

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

// "Signed-Up Students" on the staff event page: a live list of who signed up, with
// search, sorting and CSV export. This is where check-in / completion status goes.
export function EventRoster({ opportunity, onLoadError }: EventRosterProps) {
  const opportunityId = opportunity.id;
  const [signups, setSignups] = useState<Signup[]>([]);
  const [signupSearch, setSignupSearch] = useState("");
  const [signupSortMode, setSignupSortMode] =
    useState<SignupSortMode>("recent");

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onSnapshot(
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
          onLoadError(caughtError);
        }
      },
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [opportunityId, onLoadError]);

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
    const blob = new Blob([`﻿${csv}`], {
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

  return (
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
                onChange={(event) => setSignupSearch(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium">
              Sort
              <select
                className="mt-1 block h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                value={signupSortMode}
                onChange={(event) =>
                  setSignupSortMode(event.target.value as SignupSortMode)
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
                      <td className="px-3 py-2">{signup.studentName}</td>
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
  );
}
