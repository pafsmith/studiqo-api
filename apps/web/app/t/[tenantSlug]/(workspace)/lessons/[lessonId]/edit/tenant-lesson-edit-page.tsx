"use client";

import type { components } from "@studiqo/api-client/generated";
import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useLessonDetailQuery, useUpdateLessonMutation } from "@/lib/api/lessons-query";
import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import { useSubjectsListQuery } from "@/lib/api/subjects-query";
import {
  parseDatetimeLocalToIso,
  parseIsoDateTime,
  toDatetimeLocalValue,
} from "@/lib/datetime";
import { formatOrgMemberOptionLabel } from "@/lib/format-org-member";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  updateLessonFormSchema,
  type UpdateLessonForm,
} from "@/lib/validation/lesson-forms";

type Lesson = components["schemas"]["Lesson"];
type UpdateLessonBody = components["schemas"]["UpdateLessonRequest"];

function buildUpdateBody(lesson: Lesson, values: UpdateLessonForm): UpdateLessonBody {
  const body: UpdateLessonBody = {};
  if (
    values.tutorId &&
    values.tutorId !== "" &&
    values.tutorId !== lesson.tutorId
  ) {
    body.tutorId = values.tutorId;
  }
  if (
    values.subjectId &&
    values.subjectId !== "" &&
    values.subjectId !== lesson.subjectId
  ) {
    body.subjectId = values.subjectId;
  }
  if (values.startsAtLocal?.trim()) {
    const iso = parseDatetimeLocalToIso(values.startsAtLocal.trim());
    if (iso !== lesson.startsAt) {
      body.startsAt = iso;
    }
  }
  if (values.endsAtLocal?.trim()) {
    const iso = parseDatetimeLocalToIso(values.endsAtLocal.trim());
    if (iso !== lesson.endsAt) {
      body.endsAt = iso;
    }
  }
  if (values.notes !== undefined) {
    const next = values.notes === "" ? null : values.notes;
    const prev = lesson.notes;
    if (next !== prev) {
      body.notes = next;
    }
  }
  return body;
}

export function TenantLessonEditPage() {
  const params = useParams<{ tenantSlug: string; lessonId: string }>();
  const { tenantSlug, lessonId } = params;
  const router = useRouter();
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const lessonQ = useLessonDetailQuery(organizationId, lessonId);
  const subjectsQ = useSubjectsListQuery(organizationId);
  const membersQ = useOrganizationMembersQuery(organizationId, canManage);
  const updateLesson = useUpdateLessonMutation(organizationId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<UpdateLessonForm>({
    resolver: zodResolver(updateLessonFormSchema),
    defaultValues: {
      tutorId: "",
      subjectId: "",
      startsAtLocal: "",
      endsAtLocal: "",
      notes: "",
    },
  });

  const lesson = lessonQ.data;
  useEffect(() => {
    if (lesson && lesson.status === "scheduled") {
      form.reset({
        tutorId: lesson.tutorId,
        subjectId: lesson.subjectId,
        startsAtLocal: toDatetimeLocalValue(parseIsoDateTime(lesson.startsAt)),
        endsAtLocal: toDatetimeLocalValue(parseIsoDateTime(lesson.endsAt)),
        notes: lesson.notes ?? "",
      });
    }
  }, [lesson, form]);

  const base = `/t/${tenantSlug}/lessons`;

  if (!canManage) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Edit lesson</h1>
        <p style={{ opacity: 0.85 }}>
          Only organization admins can edit lessons.
        </p>
        <p>
          <Link href={`${base}/${lessonId}`}>Back to lesson</Link>
        </p>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <p>
          <Link href={`${base}/${lessonId}`}>← Lesson</Link>
        </p>
        <p>Loading…</p>
      </main>
    );
  }

  if (lessonQ.isLoading) {
    return (
      <main>
        <p>
          <Link href={`${base}/${lessonId}`}>← Lesson</Link>
        </p>
        <p>Loading lesson…</p>
      </main>
    );
  }

  if (lessonQ.error || !lesson) {
    return (
      <main>
        <p>
          <Link href={base}>← Lessons</Link>
        </p>
        <p style={{ color: "#b91c1c" }}>
          {lessonQ.error instanceof Error
            ? lessonQ.error.message
            : "Could not load lesson"}
        </p>
      </main>
    );
  }

  if (lesson.status !== "scheduled") {
    return (
      <main>
        <p>
          <Link href={`${base}/${lessonId}`}>← Lesson</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Edit lesson</h1>
        <p style={{ opacity: 0.85 }}>
          Only scheduled lessons can be edited. This lesson is{" "}
          <strong>{lesson.status}</strong>.
        </p>
      </main>
    );
  }

  const editingLesson = lesson;
  const tutors = membersQ.data?.filter((m) => m.role === "tutor") ?? [];

  async function onSubmit(values: UpdateLessonForm) {
    setFormError(null);
    const body = buildUpdateBody(editingLesson, values);
    if (Object.keys(body).length === 0) {
      setFormError("Change at least one field.");
      return;
    }
    try {
      await updateLesson.mutateAsync({ lessonId: editingLesson.id, body });
      router.push(`${base}/${editingLesson.id}`);
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not update lesson");
    }
  }

  const loadingRefs = subjectsQ.isLoading || membersQ.isLoading;

  return (
    <main style={{ maxWidth: 480 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href={`${base}/${lesson.id}`}>← Lesson</Link>
      </p>
      <h1 style={{ fontSize: 22 }}>Edit lesson</h1>

      {loadingRefs ? <p>Loading…</p> : null}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Tutor</span>
          <select
            {...form.register("tutorId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            {tutors.map((m) => (
              <option key={m.userId} value={m.userId}>
                {formatOrgMemberOptionLabel(m)}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Subject</span>
          <select
            {...form.register("subjectId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            {(subjectsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Starts</span>
          <input
            type="datetime-local"
            {...form.register("startsAtLocal")}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Ends</span>
          <input
            type="datetime-local"
            {...form.register("endsAtLocal")}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Notes</span>
          <textarea
            {...form.register("notes")}
            rows={4}
            style={{ padding: 8, fontSize: 15 }}
          />
        </label>

        {form.formState.errors.root ? (
          <span style={{ color: "#b91c1c", fontSize: 13 }}>
            {form.formState.errors.root.message}
          </span>
        ) : null}
        {form.formState.errors.endsAtLocal ? (
          <span style={{ color: "#b91c1c", fontSize: 13 }}>
            {form.formState.errors.endsAtLocal.message}
          </span>
        ) : null}

        {formError ? (
          <p style={{ color: "#b91c1c", margin: 0 }}>{formError}</p>
        ) : null}

        <button
          type="submit"
          disabled={updateLesson.isPending || loadingRefs}
          style={{ padding: "10px 14px", fontSize: 15, marginTop: 8 }}
        >
          {updateLesson.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </main>
  );
}
