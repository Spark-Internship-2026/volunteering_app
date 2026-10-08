import { isOpportunityPast } from "@/lib/opportunities";

export function normalizeSignupEmail(email: string) {
  return email.trim().toLowerCase();
}

export function signupDocIdForEmail(opportunityId: string, email: string) {
  return `${opportunityId}_${normalizeSignupEmail(email)}`;
}

// What a signup document can hold. Only staff may advance it, and the rules accept
// only these three values (firestore.restricted.rules: validSignupStatus).
export const SIGNUP_STATUSES = ["signed_up", "checked_in", "completed"] as const;

export type SignupStatus = (typeof SIGNUP_STATUSES)[number];

// What the student sees about their own signup. Two stages are not stored:
// - "not_signed_up" is the default, used when there is no signup document at all.
// - "completed" is also inferred for a past event the student signed up for, even
//   when staff never marked it. Writing it would be refused by the rules.
// "Upcoming" is NOT part of this ladder: it describes the event, not the signup,
// and is shown alongside these (see isOpportunityUpcoming).
export type SignupStage = SignupStatus | "not_signed_up";

// A signup with no `status` field is simply someone who signed up: every signup
// written before this feature existed reads as "signed_up".
export function signupStatusFromData(value: unknown): SignupStatus {
  return SIGNUP_STATUSES.includes(value as SignupStatus)
    ? (value as SignupStatus)
    : "signed_up";
}

// `status` is undefined when the student has no signup for this event.
export function signupStageFor(
  status: SignupStatus | undefined,
  date: string,
  todayDateKey?: string,
): SignupStage {
  if (!status) {
    return "not_signed_up";
  }

  // What staff recorded always wins over anything inferred from the date.
  if (status !== "signed_up") {
    return status;
  }

  // The event has been and gone, so "Signed up" would be stale: read it as done.
  if (isOpportunityPast(date, todayDateKey)) {
    return "completed";
  }

  return "signed_up";
}

export function signupStageLabel(stage: SignupStage) {
  if (stage === "not_signed_up") {
    return "Not signed up";
  }

  if (stage === "checked_in") {
    return "Checked in";
  }

  if (stage === "completed") {
    return "Completed";
  }

  return "Signed up";
}
