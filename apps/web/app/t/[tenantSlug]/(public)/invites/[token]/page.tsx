import { InviteDetailsView } from "@/components/invite-flow";

type PageProps = {
  params: Promise<{ tenantSlug: string; token: string }>;
};

export default async function TenantInviteDetailsPage({ params }: PageProps) {
  const { tenantSlug, token } = await params;
  return <InviteDetailsView token={token} expectedSlug={tenantSlug} />;
}
