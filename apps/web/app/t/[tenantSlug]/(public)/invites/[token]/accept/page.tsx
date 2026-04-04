import { InviteAcceptLoader } from "@/components/invite-flow";

type PageProps = {
  params: Promise<{ tenantSlug: string; token: string }>;
};

export default async function TenantInviteAcceptPage({ params }: PageProps) {
  const { tenantSlug, token } = await params;
  return <InviteAcceptLoader token={token} expectedSlug={tenantSlug} />;
}
