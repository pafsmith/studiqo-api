"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useCreateOrganizationMutation,
  useOrganizationsQuery,
  useSetActiveOrganizationMutation,
} from "@/lib/api/organizations-query";
import { useSession } from "@/lib/auth/session";
import { tenantWorkspaceUrl } from "@/lib/urls";
import { createOrganizationFormSchema } from "@/lib/validation/auth-forms";

type OrgForm = { name: string; slug: string };

export default function OnboardingPage() {
  const router = useRouter();
  const { authStatus } = useSession();
  const { data: orgs, isLoading: orgsLoading } = useOrganizationsQuery();
  const createOrg = useCreateOrganizationMutation();
  const setActive = useSetActiveOrganizationMutation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OrgForm>({
    resolver: zodResolver<OrgForm>(createOrganizationFormSchema),
    defaultValues: { name: "", slug: "" },
  });

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login?returnUrl=/onboarding");
    }
  }, [authStatus, router]);

  async function enterOrg(organizationId: string, slug: string) {
    setError(null);
    try {
      await setActive.mutateAsync(organizationId);
      window.location.href = tenantWorkspaceUrl(slug);
    } catch (e) {
      if (isStudiqoApiError(e)) setError(e.message);
      else setError("Could not switch organization");
    }
  }

  async function onCreate(values: OrgForm) {
    setError(null);
    try {
      const org = await createOrg.mutateAsync(values);
      await setActive.mutateAsync(org.id);
      window.location.href = tenantWorkspaceUrl(org.slug);
    } catch (e) {
      if (isStudiqoApiError(e)) setError(e.message);
      else setError("Could not create organization");
    }
  }

  if (authStatus === "loading") {
    return <p style={{ padding: 24 }}>Loading…</p>;
  }

  if (authStatus === "unauthenticated") {
    return null;
  }

  return (
    <main style={{ padding: "1.5rem", maxWidth: 520 }}>
      <h1>Organizations</h1>
      <p style={{ fontSize: 14, opacity: 0.85 }}>
        Choose an organization or create one. You will be redirected to its workspace.
      </p>
      {orgsLoading ? (
        <p>Loading organizations…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {(orgs ?? []).map((o) => (
            <li
              key={o.id}
              style={{
                padding: "12px 0",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div>
                <strong>{o.name}</strong>
                <div style={{ fontSize: 13, opacity: 0.75 }}>{o.slug}</div>
              </div>
              <button
                type="button"
                disabled={setActive.isPending}
                onClick={() => void enterOrg(o.id, o.slug)}
                style={{ padding: "8px 14px" }}
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 style={{ marginTop: 32, fontSize: 18 }}>Create organization</h2>
      <form
        onSubmit={form.handleSubmit(onCreate)}
        style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 360 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Name</span>
          <input {...form.register("name")} style={{ padding: 8 }} />
          {form.formState.errors.name ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>
              {form.formState.errors.name.message}
            </span>
          ) : null}
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Slug (URL)</span>
          <input {...form.register("slug")} style={{ padding: 8 }} />
          {form.formState.errors.slug ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>
              {form.formState.errors.slug.message}
            </span>
          ) : null}
        </label>
        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
        <button
          type="submit"
          disabled={createOrg.isPending || setActive.isPending}
          style={{ padding: "10px 16px" }}
        >
          {createOrg.isPending || setActive.isPending ? "Saving…" : "Create and open"}
        </button>
      </form>
    </main>
  );
}
