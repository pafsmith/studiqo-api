import Link from "next/link";

type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <main>
      <h1 style={{ fontSize: 22 }}>Workspace</h1>
      <p style={{ fontSize: 15, opacity: 0.85 }}>
        You are in <strong>{tenantSlug}</strong>. Open{" "}
        <Link href={`/t/${tenantSlug}/students`}>Students</Link> or{" "}
        <Link href={`/t/${tenantSlug}/lessons`}>Lessons</Link> to work in this
        organization.
      </p>
    </main>
  );
}
