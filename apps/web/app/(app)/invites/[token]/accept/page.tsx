import { InviteAcceptLoader } from "@/components/invite-flow";

type PageProps = { params: Promise<{ token: string }> };

export default async function InviteAcceptPage({ params }: PageProps) {
  const { token } = await params;
  return <InviteAcceptLoader token={token} />;
}
