import { InviteDetailsView } from "@/components/invite-flow";

type PageProps = { params: Promise<{ token: string }> };

export default async function InviteDetailsPage({ params }: PageProps) {
  const { token } = await params;
  return <InviteDetailsView token={token} />;
}
