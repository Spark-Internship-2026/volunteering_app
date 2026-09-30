import { OpportunitySignup } from "@/features/accounts/signup-page/opportunity-signup";

export default async function OpportunitySignupPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  return <OpportunitySignup opportunityId={opportunityId} />;
}
