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

export function formatHours(hours: number | null) {
  if (typeof hours !== "number" || Number.isNaN(hours)) {
    return "No hours";
  }

  const formattedHours = new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
  }).format(hours);

  return `${formattedHours} ${hours === 1 ? "hour" : "hours"}`;
}
