import { OpportunitySignup } from "@/components/opportunity-signup";

export default async function OpportunitySignupPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;

  return <OpportunitySignup opportunityId={opportunityId} />;
}
