"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import {
  acceptInvitationRequest,
  fetchInvitationDetails,
} from "@/lib/api/invitations-public";
import { useSession } from "@/lib/auth/session";
import { formatIsoDateTime } from "@/lib/datetime";
import { appShellUrl, tenantWorkspaceUrl } from "@/lib/urls";
import { acceptInviteFormSchema } from "@/lib/validation/auth-forms";

import type { components } from "@studiqo/api-client/generated";

type InvitationDetails = components["schemas"]["InvitationDetails"];

type AcceptForm = { password: string };

export function InviteDetailsView({
  token,
  expectedSlug,
}: {
  token: string;
  expectedSlug?: string;
}) {
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await fetchInvitationDetails(token);
        if (!cancelled) setDetails(d);
      } catch (e) {
        if (!cancelled) {
          if (isStudiqoApiError(e)) setError(e.message);
          else setError("Could not load invitation");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Invitation</h1>
        <p style={{ color: "#b91c1c" }}>{error}</p>
        <p style={{ fontSize: 14 }}>
          <a href={appShellUrl("/login")}>Back to log in</a>
        </p>
      </main>
    );
  }

  if (!details) {
    return <p style={{ padding: 24 }}>Loading invitation…</p>;
  }

  if (expectedSlug && details.organizationSlug !== expectedSlug) {
    return (
      <main style={{ padding: 24 }}>
        <h1>Invitation</h1>
        <p>This invitation belongs to another organization workspace.</p>
        <p style={{ fontSize: 14 }}>
          <a href={tenantWorkspaceUrl(details.organizationSlug)}>Go to the correct workspace</a>
        </p>
      </main>
    );
  }

  const acceptPath = expectedSlug
    ? `/t/${expectedSlug}/invites/${token}/accept`
    : `/invites/${token}/accept`;

  return (
    <main style={{ padding: 24, maxWidth: 480 }}>
      <h1>Invitation</h1>
      <p>
        You are invited to <strong>{details.organizationName}</strong> as a{" "}
        <strong>{details.role}</strong>.
      </p>
      <p style={{ fontSize: 14, opacity: 0.85 }}>
        Email: {details.email}
        <br />
        Expires: {formatIsoDateTime(details.expiresAt)}
      </p>
      <p>
        <a href={acceptPath}>Continue to accept</a>
      </p>
    </main>
  );
}

export function InviteAcceptForm({
  token,
  organizationSlug,
}: {
  token: string;
  organizationSlug: string;
}) {
  const { setAccessToken, refetchUser } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);

  const form = useForm<AcceptForm>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: { password: "" },
  });

  async function onSubmit(values: AcceptForm) {
    setError(null);
    setExists(false);
    try {
      const data = await acceptInvitationRequest(token, values.password);
      setAccessToken(data.token);
      await refetchUser();
      window.location.href = tenantWorkspaceUrl(organizationSlug);
    } catch (e) {
      if (isStudiqoApiError(e)) {
        if (e.status === 409) {
          setExists(true);
          return;
        }
        setError(e.message);
        return;
      }
      setError("Something went wrong");
    }
  }

  if (exists) {
    return (
      <main style={{ padding: 24, maxWidth: 400 }}>
        <h1>Account exists</h1>
        <p>An account already uses this email. Log in to join the organization.</p>
        <p>
          <a href={appShellUrl("/login")}>Log in</a>
        </p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 400 }}>
      <h1>Set your password</h1>
      <p style={{ fontSize: 14, opacity: 0.85 }}>
        Create a password for your parent account at <strong>{organizationSlug}</strong>.
      </p>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Password</span>
          <input type="password" autoComplete="new-password" {...form.register("password")} style={{ padding: 8 }} />
          {form.formState.errors.password ? (
            <span style={{ color: "#b91c1c", fontSize: 12 }}>
              {form.formState.errors.password.message}
            </span>
          ) : null}
        </label>
        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
        <button type="submit" disabled={form.formState.isSubmitting} style={{ padding: "10px 16px" }}>
          {form.formState.isSubmitting ? "Accepting…" : "Accept invitation"}
        </button>
      </form>
    </main>
  );
}

export function InviteAcceptLoader({
  token,
  expectedSlug,
}: {
  token: string;
  expectedSlug?: string;
}) {
  const [slug, setSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const d = await fetchInvitationDetails(token);
        if (cancelled) return;
        if (expectedSlug && d.organizationSlug !== expectedSlug) {
          setError("wrong-tenant");
          return;
        }
        setSlug(d.organizationSlug);
      } catch (e) {
        if (!cancelled) {
          if (isStudiqoApiError(e)) setError(e.message);
          else setError("load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, expectedSlug]);

  if (error === "wrong-tenant") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Wrong workspace</h1>
        <p>This invitation is not for this organization URL.</p>
        <a href={appShellUrl("/login")}>Log in</a>
      </main>
    );
  }

  if (error && error !== "wrong-tenant") {
    return (
      <main style={{ padding: 24 }}>
        <h1>Invitation</h1>
        <p style={{ color: "#b91c1c" }}>{error}</p>
      </main>
    );
  }

  if (!slug) {
    return <p style={{ padding: 24 }}>Loading…</p>;
  }

  return <InviteAcceptForm token={token} organizationSlug={slug} />;
}
