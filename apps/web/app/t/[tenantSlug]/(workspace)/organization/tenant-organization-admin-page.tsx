"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { components } from "@studiqo/api-client/generated";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  useAddOrganizationMemberMutation,
  useOrganizationMembersQuery,
} from "@/lib/api/organization-members-query";
import { useOrganizationsQuery } from "@/lib/api/organizations-query";
import { useUpdateUserMutation } from "@/lib/api/users-mutation";
import { useSession } from "@/lib/auth/session";
import { formatIsoDateTime } from "@/lib/datetime";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  addOrganizationMemberFormSchema,
  type AddOrganizationMemberForm,
  organizationMembershipRoleSchema,
} from "@/lib/validation/organization-admin-forms";

type OrgMember = components["schemas"]["OrganizationMembership"];
type OrgRole = components["schemas"]["OrganizationMembershipRole"];

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: "org_admin", label: "Organization admin" },
  { value: "tutor", label: "Tutor" },
  { value: "parent", label: "Parent" },
];

function MemberRoleRow({
  member,
  currentUserId,
  adminCount,
  isSaving,
  onSaveRole,
}: {
  member: OrgMember;
  currentUserId: string | undefined;
  adminCount: number;
  isSaving: boolean;
  onSaveRole: (userId: string, role: OrgRole) => void;
}) {
  const [role, setRole] = useState<OrgRole>(member.role);

  useEffect(() => {
    setRole(member.role);
  }, [member.role]);

  const isOnlyAdmin =
    member.role === "org_admin" && adminCount === 1;
  const locked =
    currentUserId === member.userId || isOnlyAdmin;
  const dirty = role !== member.role;

  return (
    <tr>
      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
        {member.email}
      </td>
      <td style={{ padding: "10px 12px", borderBottom: "1px solid #eee" }}>
        <select
          value={role}
          disabled={locked}
          onChange={(e) => {
            const v = organizationMembershipRoleSchema.safeParse(e.target.value);
            if (v.success) setRole(v.data);
          }}
          style={{ padding: 6, minWidth: 160 }}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {locked ? (
          <span style={{ display: "block", fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {currentUserId === member.userId
              ? "You cannot change your own role here."
              : "This organization must keep at least one admin."}
          </span>
        ) : null}
        {!locked && dirty ? (
          <button
            type="button"
            disabled={isSaving}
            onClick={() => onSaveRole(member.userId, role)}
            style={{ marginLeft: 10, padding: "6px 12px", fontSize: 13 }}
          >
            {isSaving ? "Saving…" : "Save role"}
          </button>
        ) : null}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid #eee",
          fontSize: 13,
          opacity: 0.85,
        }}
      >
        {formatIsoDateTime(member.createdAt)}
      </td>
    </tr>
  );
}

export function TenantOrganizationAdminPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user } = useSession();
  const { data: orgs, isLoading: orgsLoading } = useOrganizationsQuery();

  const organizationId = useMemo(() => {
    return orgs?.find((o) => o.slug === tenantSlug)?.id ?? null;
  }, [orgs, tenantSlug]);

  const canManage = isOrgAdminOrSuperadmin(user?.role, user?.isSuperadmin ?? false);

  const membersQ = useOrganizationMembersQuery(
    organizationId,
    canManage,
  );

  const addMember = useAddOrganizationMemberMutation(organizationId ?? "");
  const updateUser = useUpdateUserMutation(organizationId ?? "");

  const [roleSaveError, setRoleSaveError] = useState<string | null>(null);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const addForm = useForm<AddOrganizationMemberForm>({
    resolver: zodResolver(addOrganizationMemberFormSchema),
    defaultValues: { userId: "", role: "tutor" },
  });

  const adminCount = useMemo(
    () =>
      (membersQ.data ?? []).filter((m) => m.role === "org_admin").length,
    [membersQ.data],
  );

  async function handleSaveRole(userId: string, role: OrgRole) {
    setRoleSaveError(null);
    try {
      await updateUser.mutateAsync({ userId, body: { role } });
    } catch (e) {
      if (isStudiqoApiError(e)) setRoleSaveError(e.message);
      else setRoleSaveError("Could not update role");
    }
  }

  async function onAddMemberSubmit(values: AddOrganizationMemberForm) {
    setAddMemberError(null);
    try {
      await addMember.mutateAsync({
        userId: values.userId.trim(),
        role: values.role,
      });
      addForm.reset({ userId: "", role: "tutor" });
    } catch (e) {
      if (isStudiqoApiError(e)) setAddMemberError(e.message);
      else setAddMemberError("Could not add member");
    }
  }

  if (!canManage) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Organization members</h1>
        <p style={{ opacity: 0.85 }}>
          Only organization admins can view or manage members. Contact an admin
          if you need changes.
        </p>
      </main>
    );
  }

  if (orgsLoading) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Organization members</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (!organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Organization members</h1>
        <p style={{ opacity: 0.85 }}>
          This workspace does not match an organization in your account.
        </p>
      </main>
    );
  }

  const listError =
    membersQ.error && isStudiqoApiError(membersQ.error)
      ? membersQ.error.message
      : membersQ.error
        ? "Could not load members"
        : null;

  const base = `/t/${tenantSlug}`;

  return (
    <main>
      <h1 style={{ fontSize: 22 }}>Organization members</h1>
      <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 640 }}>
        Manage roles for accounts already registered in Studiqo. To invite
        parents by email, use{" "}
        <Link href={`${base}/invites`} style={{ textDecoration: "underline" }}>
          Parent invitations
        </Link>
        . Adding a member below requires the user&apos;s account ID (UUID), not
        their email.
      </p>

      <section style={{ marginTop: 28, maxWidth: 520 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Add member by user ID</h2>
        <form
          onSubmit={addForm.handleSubmit(onAddMemberSubmit)}
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14 }}>User ID (UUID)</span>
            <input
              {...addForm.register("userId")}
              autoComplete="off"
              placeholder="00000000-0000-4000-8000-000000000000"
              style={{ padding: 8, fontFamily: "ui-monospace, monospace" }}
            />
            {addForm.formState.errors.userId ? (
              <span style={{ color: "#b91c1c", fontSize: 12 }}>
                {addForm.formState.errors.userId.message}
              </span>
            ) : null}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14 }}>Role</span>
            <select
              {...addForm.register("role")}
              style={{ padding: 8, maxWidth: 280 }}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            {addForm.formState.errors.role ? (
              <span style={{ color: "#b91c1c", fontSize: 12 }}>
                {addForm.formState.errors.role.message}
              </span>
            ) : null}
          </label>
          {addMemberError ? (
            <p style={{ color: "#b91c1c", fontSize: 14 }}>{addMemberError}</p>
          ) : null}
          <button
            type="submit"
            disabled={addMember.isPending}
            style={{ padding: "10px 16px", alignSelf: "flex-start" }}
          >
            {addMember.isPending ? "Adding…" : "Add member"}
          </button>
        </form>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: 16, marginBottom: 12 }}>Members</h2>
        {roleSaveError ? (
          <p style={{ color: "#b91c1c", marginBottom: 12 }}>{roleSaveError}</p>
        ) : null}
        {listError ? (
          <p style={{ color: "#b91c1c" }}>{listError}</p>
        ) : membersQ.isLoading ? (
          <p>Loading members…</p>
        ) : (membersQ.data?.length ?? 0) === 0 ? (
          <p style={{ opacity: 0.75 }}>No members found.</p>
        ) : (
          <div style={{ overflowX: "auto", maxWidth: 900 }}>
            <table
              style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Role
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    Member since
                  </th>
                </tr>
              </thead>
              <tbody>
                {membersQ.data!.map((member) => (
                  <MemberRoleRow
                    key={member.userId}
                    member={member}
                    currentUserId={user?.id}
                    adminCount={adminCount}
                    isSaving={
                      updateUser.isPending &&
                      updateUser.variables?.userId === member.userId
                    }
                    onSaveRole={handleSaveRole}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
