import type { DocumentData } from "firebase/firestore";

export type Opportunity = {
  id: string;
  title: string;
  description: string;
  location: string;
  hours: number | null;
  date: string;
  wrapUpSummary: string;
  videoUrl: string;
  createdBy: string;
};

export function opportunityFromData(
  id: string,
  data: DocumentData,
): Opportunity {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled",
    description: typeof data.description === "string" ? data.description : "",
    location: typeof data.location === "string" ? data.location : "",
    hours: typeof data.hours === "number" ? data.hours : null,
    date: typeof data.date === "string" ? data.date : "",
    wrapUpSummary:
      typeof data.wrapUpSummary === "string" ? data.wrapUpSummary : "",
    videoUrl: typeof data.videoUrl === "string" ? data.videoUrl : "",
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
  };
}

export function sortOpportunitiesByDate(opportunities: Opportunity[]) {
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

export function formatOpportunityDate(date: string) {
  if (!date) {
    return "No date";
  }

  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function isOpportunityPast(
  date: string,
  todayDateKey = getLocalDateKey(),
) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date < todayDateKey;
}

// Whole days from today to the event date: 0 is today, negative is in the past.
// null when either date is not a YYYY-MM-DD key.
export function daysUntilOpportunity(
  date: string,
  todayDateKey = getLocalDateKey(),
) {
  const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateKeyPattern.test(date) || !dateKeyPattern.test(todayDateKey)) {
    return null;
  }

  const [year, month, day] = date.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = todayDateKey.split("-").map(Number);

  // UTC on both sides: a daylight saving change must not turn 7 days into 6.9.
  const millisPerDay = 24 * 60 * 60 * 1000;
  const target = Date.UTC(year, month - 1, day);
  const today = Date.UTC(todayYear, todayMonth - 1, todayDay);

  return Math.round((target - today) / millisPerDay);
}

// How close an event has to be before it counts as upcoming.
export const UPCOMING_WINDOW_DAYS = 7;

// True for an event happening today or within the next week. This describes the
// event itself, so it does not depend on whether anyone has signed up.
export function isOpportunityUpcoming(
  date: string,
  todayDateKey = getLocalDateKey(),
) {
  const daysUntil = daysUntilOpportunity(date, todayDateKey);

  return (
    daysUntil !== null && daysUntil >= 0 && daysUntil <= UPCOMING_WINDOW_DAYS
  );
}

export function signupClosesAtForDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day + 1);
}

export function formatHours(hours: number | null) {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "No hours";
  }

  const formattedHours = new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(hours);

  return `${formattedHours} ${hours === 1 ? "hour" : "hours"}`;
}
