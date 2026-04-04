"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useCreateOrganizationInvitationMutation,
  useOrganizationInvitationsQuery,
  useResendOrganizationInvitationMutation,
  useRevokeOrganizationInvitationMutation,
} from "@/lib/api/organization-invitations-query";
import { useOrganizationsQuery } from "@/lib/api/organizations-query";
import { useSession } from "@/lib/auth/session";
import { formatIsoDateTime } from "@/lib/datetime";
import { inviteParentEmailSchema } from "@/lib/validation/auth-forms";

type InviteForm = { email: string };

function invitationStatus(row: {
  acceptedAt: string | null;
  revokedAt: string | null;
  expiresAt: string;
}): "accepted" | "revoked" | "expired" | "pending" {
  if (row.acceptedAt) return "accepted";
  if (row.revokedAt) return "revoked";
  if (new Date(row.expiresAt) < new Date()) return "expired";
  return "pending";
}

export function TenantInvitesPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user } = useSession();
  const { data: orgs, isLoading: orgsLoading } = useOrganizationsQuery();

  const organizationId = useMemo(() => {
    return orgs?.find((o) => o.slug === tenantSlug)?.id ?? null;
  }, [orgs, tenantSlug]);

  const canManageInvites =
    user?.role === "org_admin" || user?.isSuperadmin === true;

  const { data: invitations, isLoading: invitesLoading, error: invitesError } =
    useOrganizationInvitationsQuery(canManageInvites ? organizationId : null);

  const createInvite = useCreateOrganizationInvitationMutation(
    organizationId ?? "",
  );
  const resendInvite = useResendOrganizationInvitationMutation(
    organizationId ?? "",
  );
  const revokeInvite = useRevokeOrganizationInvitationMutation(
    organizationId ?? "",
  );

  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteParentEmailSchema),
    defaultValues: { email: "" },
  });

  if (!canManageInvites) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Parent invitations</h1>
        <p style={{ opacity: 0.85 }}>
          Only organization admins can invite parents. Contact an admin if you
          need access for a family member.
        </p>
      </main>
    );
  }

  if (orgsLoading) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Parent invitations</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (!organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Parent invitations</h1>
        <p style={{ opacity: 0.85 }}>
          This workspace does not match an organization in your account.
        </p>
      </main>
    );
  }

  async function onInviteSubmit(values: InviteForm) {
    setFormError(null);
    try {
      await createInvite.mutateAsync({ email: values.email });
      form.reset();
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not send invitation");
    }
  }

  const listError =
    invitesError && isStudiqoApiError(invitesError)
      ? invitesError.message
      : invitesError
        ? "Could not load invitations"
        : null;

  return (
    <main>
      <h1 style={{ fontSize: 22 }}>Parent invitations</h1>
      <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 560 }}>
        Send email invitations for parents to join this organization. Each
        invitee sets their password when they accept the link.
      </p>

      <section style={{ marginTop: 28, maxWidth: 400 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Invite by email</h2>
        <form
          onSubmit={form.handleSubmit(onInviteSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14 }}>Email</span>
            <input
              type="email"
              autoComplete="off"
              placeholder="parent@example.com"
              {...form.register("email")}
              style={{ padding: 8 }}
            />
            {form.formState.errors.email ? (
              <span style={{ color: "#b91c1c", fontSize: 12 }}>
                {form.formState.errors.email.message}
              </span>
            ) : null}
          </label>
          {formError ? (
            <p style={{ color: "#b91c1c", fontSize: 14 }}>{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createInvite.isPending}
            style={{ padding: "10px 16px", alignSelf: "flex-start" }}
          >
            {createInvite.isPending ? "Sending…" : "Send invitation"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Invitations</h2>
        {listError ? (
          <p style={{ color: "#b91c1c" }}>{listError}</p>
        ) : invitesLoading ? (
          <p>Loading invitations…</p>
        ) : (invitations?.length ?? 0) === 0 ? (
          <p style={{ opacity: 0.75 }}>No invitations yet.</p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              maxWidth: 720,
            }}
          >
            {invitations!.map((inv) => {
              const status = invitationStatus(inv);
              const canAct = status === "pending";
              return (
                <li
                  key={inv.id}
                  style={{
                    padding: "14px 0",
                    borderBottom: "1px solid #eee",
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "baseline",
                      justifyContent: "space-between",
                    }}
                  >
                    <strong>{inv.email}</strong>
                    <span style={{ fontSize: 13, opacity: 0.8 }}>
                      {status === "pending"
                        ? "Pending"
                        : status === "accepted"
                          ? "Accepted"
                          : status === "revoked"
                            ? "Revoked"
                            : "Expired"}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, opacity: 0.75 }}>
                    Expires {formatIsoDateTime(inv.expiresAt)} · Role{" "}
                    {inv.role}
                  </div>
                  {canAct ? (
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        type="button"
                        disabled={resendInvite.isPending}
                        style={{ padding: "6px 12px", fontSize: 13 }}
                        onClick={() => {
                          void resendInvite.mutateAsync(inv.id);
                        }}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        disabled={revokeInvite.isPending}
                        style={{
                          padding: "6px 12px",
                          fontSize: 13,
                          color: "#991b1b",
                        }}
                        onClick={() => {
                          void revokeInvite.mutateAsync(inv.id);
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
