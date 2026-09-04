export function normalizeSignupEmail(email: string) {
  return email.trim().toLowerCase();
}

export function signupDocIdForEmail(opportunityId: string, email: string) {
  return `${opportunityId}_${normalizeSignupEmail(email)}`;
}
