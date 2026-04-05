"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { useCreateLessonMutation } from "@/lib/api/lessons-query";
import { useStudentsListQuery } from "@/lib/api/students-query";
import { useSubjectsListQuery } from "@/lib/api/subjects-query";
import {
  parseDatetimeLocalToIso,
  toDatetimeLocalValue,
} from "@/lib/datetime";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  createLessonFormSchema,
  type CreateLessonForm,
} from "@/lib/validation/lesson-forms";

function defaultLessonTimes(): { start: string; end: string } {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  return {
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(end),
  };
}

export function TenantLessonNewPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const router = useRouter();
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const defaults = useMemo(() => defaultLessonTimes(), []);
  const studentsQ = useStudentsListQuery(organizationId);
  const subjectsQ = useSubjectsListQuery(organizationId);
  const createLesson = useCreateLessonMutation(organizationId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateLessonForm>({
    resolver: zodResolver(createLessonFormSchema),
    defaultValues: {
      studentId: "",
      subjectId: "",
      startsAtLocal: defaults.start,
      endsAtLocal: defaults.end,
    },
  });

  const studentId = form.watch("studentId");
  const students = studentsQ.data ?? [];
  const selectedStudent = students.find((s) => s.id === studentId);

  const base = `/t/${tenantSlug}/lessons`;

  if (!canManage) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>New lesson</h1>
        <p style={{ opacity: 0.85 }}>
          Only organization admins can create lessons.
        </p>
        <p>
          <Link href={base}>Back to lessons</Link>
        </p>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>New lesson</h1>
        <p>Loading…</p>
      </main>
    );
  }

  async function onSubmit(values: CreateLessonForm) {
    setFormError(null);
    const tutorId = selectedStudent?.tutorId;
    if (!tutorId) {
      setFormError(
        "This student has no assigned tutor. Assign a tutor on the student before scheduling.",
      );
      return;
    }
    try {
      const lesson = await createLesson.mutateAsync({
        studentId: values.studentId,
        tutorId,
        subjectId: values.subjectId,
        startsAt: parseDatetimeLocalToIso(values.startsAtLocal),
        endsAt: parseDatetimeLocalToIso(values.endsAtLocal),
      });
      router.push(`${base}/${lesson.id}`);
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not create lesson");
    }
  }

  const loadingRefs = studentsQ.isLoading || subjectsQ.isLoading;

  return (
    <main style={{ maxWidth: 480 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href={base}>← Lessons</Link>
      </p>
      <h1 style={{ fontSize: 22 }}>New lesson</h1>

      {loadingRefs ? <p>Loading…</p> : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Student</span>
          <select
            {...form.register("studentId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
          {form.formState.errors.studentId ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.studentId.message}
            </span>
          ) : null}
        </label>

        {selectedStudent && !selectedStudent.tutorId ? (
          <p style={{ color: "#b45309", fontSize: 14, margin: 0 }}>
            This student has no tutor assigned. Update the student before
            creating a lesson.
          </p>
        ) : selectedStudent?.tutorId ? (
          <p style={{ fontSize: 14, opacity: 0.85, margin: 0 }}>
            Tutor for this lesson is the student&apos;s assigned tutor (set on
            the student record).
          </p>
        ) : null}

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Subject</span>
          <select
            {...form.register("subjectId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            <option value="">Select subject…</option>
            {(subjectsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {form.formState.errors.subjectId ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.subjectId.message}
            </span>
          ) : null}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Starts</span>
          <input
            type="datetime-local"
            {...form.register("startsAtLocal")}
            style={{ padding: 8, fontSize: 15 }}
          />
          {form.formState.errors.startsAtLocal ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.startsAtLocal.message}
            </span>
          ) : null}
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Ends</span>
          <input
            type="datetime-local"
            {...form.register("endsAtLocal")}
            style={{ padding: 8, fontSize: 15 }}
          />
          {form.formState.errors.endsAtLocal ? (
            <span style={{ color: "#b91c1c", fontSize: 13 }}>
              {form.formState.errors.endsAtLocal.message}
            </span>
          ) : null}
        </label>

        {formError ? (
          <p style={{ color: "#b91c1c", margin: 0 }}>{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={createLesson.isPending || loadingRefs}
          style={{ padding: "10px 14px", fontSize: 15, marginTop: 8 }}
        >
          {createLesson.isPending ? "Creating…" : "Create lesson"}
        </button>
      </form>
    </main>
  );
}
