// Look and label of the sign up / remove signup button used on the student event
// cards and in the event details window.

export function signupButtonClass(isSignedUp: boolean, className: string) {
  return `${className} rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-400 ${
    isSignedUp
      ? "border border-red-200 bg-white text-red-700 hover:bg-red-50"
      : "bg-blue-700 text-white hover:bg-blue-800"
  }`;
}

export function signupButtonLabel(
  isSignedUp: boolean,
  isSubmitting: boolean,
  isRemoving: boolean,
  isPast: boolean,
) {
  if (isPast) {
    return "Event passed";
  }

  if (isSignedUp) {
    return isRemoving ? "Removing" : "Remove signup";
  }

  return isSubmitting ? "Signing up" : "Sign up";
}
