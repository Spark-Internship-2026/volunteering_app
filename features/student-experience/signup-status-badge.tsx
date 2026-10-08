import { signupStageLabel, type SignupStage } from "@/lib/signups";

const badgeClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium";

const badgeClassByStage: Record<SignupStage, string> = {
  not_signed_up: "border-zinc-200 bg-white text-zinc-500",
  signed_up: "border-blue-200 bg-blue-50 text-blue-700",
  checked_in: "border-amber-200 bg-amber-50 text-amber-800",
  completed: "border-green-200 bg-green-50 text-green-800",
};

// Badges that describe the event rather than the student's signup. "upcoming" is
// the only one so far; a sibling like "today" or "full" would be added here.
export const EVENT_BADGE_TONES = ["upcoming"] as const;

export type EventBadgeTone = (typeof EVENT_BADGE_TONES)[number];

const badgeClassByEventTone: Record<EventBadgeTone, string> = {
  upcoming: "border-violet-200 bg-violet-50 text-violet-700",
};

const badgeLabelByEventTone: Record<EventBadgeTone, string> = {
  upcoming: "Upcoming",
};

type SignupStatusBadgeProps = {
  stage: SignupStage;
};

// Whether this student is signed up, and how far their signup has got.
export function SignupStatusBadge({ stage }: SignupStatusBadgeProps) {
  return (
    <span className={`${badgeClass} ${badgeClassByStage[stage]}`}>
      {signupStageLabel(stage)}
    </span>
  );
}

type EventBadgeProps = {
  tone: EventBadgeTone;
};

// Shown next to the signup badge: "upcoming" means the event is within a week.
// This is about the event, not the signup, so it appears whether or not the
// student joined. Adding a tone is a line in each map above, not a new component.
export function EventBadge({ tone }: EventBadgeProps) {
  return (
    <span className={`${badgeClass} ${badgeClassByEventTone[tone]}`}>
      {badgeLabelByEventTone[tone]}
    </span>
  );
}
