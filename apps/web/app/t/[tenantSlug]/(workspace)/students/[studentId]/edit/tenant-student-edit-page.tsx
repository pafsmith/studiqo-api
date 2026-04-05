"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { components } from "@studiqo/api-client/generated";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import {
  useStudentDetailQuery,
  useUpdateStudentMutation,
} from "@/lib/api/students-query";
import { formatIsoDate } from "@/lib/datetime";
import { formatOrgMemberOptionLabel } from "@/lib/format-org-member";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  updateStudentFormSchema,
  type UpdateStudentForm,
} from "@/lib/validation/student-forms";

function dateInputFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TenantStudentEditPage() {
  const params = useParams<{ tenantSlug: string; studentId: string }>();
  const { tenantSlug, studentId } = params;
  const router = useRouter();
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const { data: student, isLoading: studentLoading } = useStudentDetailQuery(
    organizationId,
    studentId,
  );
  const { data: members, isLoading: membersLoading } =
    useOrganizationMembersQuery(organizationId, canManage);
  const updateStudent = useUpdateStudentMutation(organizationId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<UpdateStudentForm>({
    resolver: zodResolver(updateStudentFormSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (!student) return;
    form.reset({
      parentId: student.parentId,
      tutorId: student.tutorId ?? "",
      firstName: student.firstName,
      lastName: student.lastName,
      dateOfBirth: dateInputFromIso(student.dateOfBirth),
    });
  }, [student, form]);

  const parents =
    members?.filter((m) => m.role === "parent") ?? [];
  const tutors =
    members?.filter((m) => m.role === "tutor") ?? [];

  const base = `/t/${tenantSlug}/students`;
  const detailUrl = `${base}/${studentId}`;

  if (!canManage) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Edit student</h1>
        <p style={{ opacity: 0.85 }}>Only organization admins can edit students.</p>
        <p>
          <Link href={detailUrl}>Back</Link>
        </p>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Edit student</h1>
        <p>Loading…</p>
      </main>
    );
  }

  async function onSubmit(values: UpdateStudentForm) {
    setFormError(null);
    const dirty = form.formState.dirtyFields;
    const body: components["schemas"]["UpdateStudentRequest"] = {};
    if (dirty.parentId && values.parentId !== undefined) {
      body.parentId = values.parentId;
    }
    if (dirty.firstName && values.firstName !== undefined) {
      body.firstName = values.firstName;
    }
    if (dirty.lastName && values.lastName !== undefined) {
      body.lastName = values.lastName;
    }
    if (
      dirty.dateOfBirth &&
      values.dateOfBirth !== undefined &&
      values.dateOfBirth !== ""
    ) {
      body.dateOfBirth = `${values.dateOfBirth}T12:00:00.000Z`;
    }
    if (dirty.tutorId && values.tutorId !== undefined) {
      if (values.tutorId === "") {
        setFormError("Removing a tutor is not supported by the API yet.");
        return;
      }
      body.tutorId = values.tutorId;
    }
    if (Object.keys(body).length === 0) {
      setFormError("Change at least one field");
      return;
    }
    try {
      await updateStudent.mutateAsync({ studentId, body });
      router.push(detailUrl);
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not update student");
    }
  }

  if (studentLoading) {
    return (
      <main>
        <p>
          <Link href={base}>← Students</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit student</h1>
        <p>Loading…</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main>
        <p>
          <Link href={base}>← Students</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit student</h1>
        <p>Student not found.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href={detailUrl}>← {student.firstName} {student.lastName}</Link>
      </p>
      <h1 style={{ fontSize: 22 }}>Edit student</h1>
      <p style={{ fontSize: 14, opacity: 0.8 }}>
        Born {formatIsoDate(student.dateOfBirth)}
      </p>

      {membersLoading ? <p>Loading members…</p> : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Parent</span>
          <select
            {...form.register("parentId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            {parents.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatOrgMemberOptionLabel(m)}
              </option>
            ))}
            {student &&
            !parents.some((m) => m.userId === student.parentId) ? (
              <option value={student.parentId}>
                Current parent (id {student.parentId.slice(0, 8)}…)
              </option>
            ) : null}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Tutor</span>
          <select
            {...form.register("tutorId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            {!student.tutorId ? (
              <option value="">No tutor</option>
            ) : null}
            {tutors.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatOrgMemberOptionLabel(m)}
              </option>
            ))}
            {student.tutorId &&
            !tutors.some((m) => m.userId === student.tutorId) ? (
              <option value={student.tutorId}>
                Current tutor (id {student.tutorId.slice(0, 8)}…)
              </option>
            ) : null}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>First name</span>
          <input
            {...form.register("firstName")}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Last name</span>
          <input
            {...form.register("lastName")}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Date of birth</span>
          <input
            type="date"
            {...form.register("dateOfBirth")}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        {form.formState.errors.root ? (
          <span style={{ color: "#b91c1c", fontSize: 13 }}>
            {form.formState.errors.root.message}
          </span>
        ) : null}

        {formError ? (
          <p style={{ color: "#b91c1c", margin: 0 }}>{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={updateStudent.isPending}
          style={{ padding: "10px 14px", fontSize: 15, marginTop: 8 }}
        >
          {updateStudent.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
