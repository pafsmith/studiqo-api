type PageProps = { params: Promise<{ tenantSlug: string }> };

export default async function TenantHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <main>
      <h1 style={{ fontSize: 22 }}>Workspace</h1>
      <p style={{ fontSize: 15, opacity: 0.85 }}>
        You are in <strong>{tenantSlug}</strong>. Student and lesson tools arrive in Phase 2 and 3.
      </p>
    </main>
  );
}
