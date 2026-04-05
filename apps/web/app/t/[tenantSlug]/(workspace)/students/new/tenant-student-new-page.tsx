"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateStudentMutation } from "@/lib/api/students-query";
import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import { formatOrgMemberOptionLabel } from "@/lib/format-org-member";
import {
  createStudentFormSchema,
  type CreateStudentForm,
} from "@/lib/validation/student-forms";

export function TenantStudentNewPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const router = useRouter();
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const { data: members, isLoading: membersLoading } =
    useOrganizationMembersQuery(organizationId, canManage);
  const createStudent = useCreateStudentMutation(organizationId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateStudentForm>({
    resolver: zodResolver(createStudentFormSchema),
    defaultValues: {
      parentId: "",
      tutorId: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
    },
  });

  const parents =
    members?.filter((m) => m.role === "parent") ?? [];
  const tutors =
    members?.filter((m) => m.role === "tutor") ?? [];

  const base = `/t/${tenantSlug}/students`;

  if (!canManage) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>New student</h1>
        <p style={{ opacity: 0.85 }}>
          Only organization admins can create students.
        </p>
        <p>
          <Link href={base}>Back to students</Link>
        </p>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>New student</h1>
        <p>Loading…</p>
      </main>
    );
  }

  async function onSubmit(values: CreateStudentForm) {
    setFormError(null);
    try {
      const body = {
        parentId: values.parentId,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        ...(values.tutorId && values.tutorId !== ""
          ? { tutorId: values.tutorId }
          : {}),
      };
      const student = await createStudent.mutateAsync(body);
      router.push(`${base}/${student.id}`);
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not create student");
    }
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href={base}>← Students</Link>
      </p>
      <h1 style={{ fontSize: 22 }}>New student</h1>

      {membersLoading ? <p>Loading members…</p> : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Parent (member)</span>
          <select
            {...form.register("parentId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            <option value="">Select parent user…</option>
            {parents.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatOrgMemberOptionLabel(m)}
              </option>
            ))}
          </select>
          {form.formState.errors.parentId ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.parentId.message}
            </span>
          ) : null}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Tutor (optional)</span>
          <select
            {...form.register("tutorId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            <option value="">None</option>
            {tutors.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatOrgMemberOptionLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>First name</span>
          <input
            {...form.register("firstName")}
            style={{ padding: 8, fontSize: 15 }}
            autoComplete="given-name"
          />
          {form.formState.errors.firstName ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.firstName.message}
            </span>
          ) : null}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Last name</span>
          <input
            {...form.register("lastName")}
            style={{ padding: 8, fontSize: 15 }}
            autoComplete="family-name"
          />
          {form.formState.errors.lastName ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.lastName.message}
            </span>
          ) : null}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Date of birth</span>
          <input
            type="date"
            {...form.register("dateOfBirth")}
            style={{ padding: 8, fontSize: 15 }}
          />
          {form.formState.errors.dateOfBirth ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {String(form.formState.errors.dateOfBirth.message)}
            </span>
          ) : null}
        </label>

        {formError ? (
          <p style={{ color: "#b91c1c", margin: 0 }}>{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={createStudent.isPending || membersLoading}
          style={{ padding: "10px 14px", fontSize: 15, marginTop: 8 }}
        >
          {createStudent.isPending ? "Creating…" : "Create student"}
        </button>
      </form>
    </main>
  );
}
