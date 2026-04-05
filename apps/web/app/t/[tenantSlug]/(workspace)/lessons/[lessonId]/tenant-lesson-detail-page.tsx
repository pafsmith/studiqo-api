"use client";

import type { components } from "@studiqo/api-client/generated";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  useCancelLessonMutation,
  useCompleteLessonMutation,
  useLessonDetailQuery,
} from "@/lib/api/lessons-query";
import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import { useStudentsListQuery } from "@/lib/api/students-query";
import { useSubjectsListQuery } from "@/lib/api/subjects-query";
import { formatIsoDateTime } from "@/lib/datetime";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";

type Student = components["schemas"]["Student"];
type Subject = components["schemas"]["Subject"];
type OrgMember = components["schemas"]["OrganizationMembership"];

export function TenantLessonDetailPage() {
  const params = useParams<{ tenantSlug: string; lessonId: string }>();
  const { tenantSlug, lessonId } = params;
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const isTutor = user?.role === "tutor";
  const canTryLifecycle = isAdmin || isTutor;

  const lessonQ = useLessonDetailQuery(organizationId, lessonId);
  const studentsQ = useStudentsListQuery(organizationId);
  const subjectsQ = useSubjectsListQuery(organizationId);
  const membersQ = useOrganizationMembersQuery(organizationId, true);

  const completeMut = useCompleteLessonMutation(organizationId ?? "");
  const cancelMut = useCancelLessonMutation(organizationId ?? "");

  const studentById = useMemo(() => {
    const m = new Map<string, Student>();
    for (const s of studentsQ.data ?? []) {
      m.set(s.id, s);
    }
    return m;
  }, [studentsQ.data]);

  const subjectById = useMemo(() => {
    const m = new Map<string, Subject>();
    for (const s of subjectsQ.data ?? []) {
      m.set(s.id, s);
    }
    return m;
  }, [subjectsQ.data]);

  const memberByUserId = useMemo(() => {
    const m = new Map<string, OrgMember>();
    for (const mem of membersQ.data ?? []) {
      m.set(mem.userId, mem);
    }
    return m;
  }, [membersQ.data]);

  const base = `/t/${tenantSlug}/lessons`;
  const listUrl = base;

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Lessons</Link>
        </p>
        <p>Loading…</p>
      </main>
    );
  }

  if (lessonQ.isLoading) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Lessons</Link>
        </p>
        <p>Loading lesson…</p>
      </main>
    );
  }

  if (lessonQ.error) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Lessons</Link>
        </p>
        <p style={{ color: "#b91c1c" }}>
          {lessonQ.error instanceof Error
            ? lessonQ.error.message
            : "Could not load lesson"}
        </p>
      </main>
    );
  }

  const lesson = lessonQ.data;
  if (!lesson) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Lessons</Link>
        </p>
        <p>Lesson not found.</p>
      </main>
    );
  }

  const stu = studentById.get(lesson.studentId);
  const sub = subjectById.get(lesson.subjectId);
  const tut = memberByUserId.get(lesson.tutorId);
  const studentLabel = stu
    ? `${stu.firstName} ${stu.lastName}`
    : lesson.studentId;
  const subjectLabel = sub?.name ?? lesson.subjectId;
  const tutorLabel = tut?.email ?? lesson.tutorId;

  const terminal = lesson.status === "completed" || lesson.status === "cancelled";
  const canCompleteOrCancel = canTryLifecycle && !terminal;
  const mutating = completeMut.isPending || cancelMut.isPending;
  const lessonIdStable = lesson.id;

  async function onComplete() {
    setActionError(null);
    try {
      await completeMut.mutateAsync(lessonIdStable);
    } catch (e) {
      if (isStudiqoApiError(e)) setActionError(e.message);
      else setActionError("Could not complete lesson");
    }
  }

  async function onCancel() {
    setActionError(null);
    try {
      await cancelMut.mutateAsync(lessonIdStable);
    } catch (e) {
      if (isStudiqoApiError(e)) setActionError(e.message);
      else setActionError("Could not cancel lesson");
    }
  }

  const canEdit = isAdmin && lesson.status === "scheduled";

  return (
    <main style={{ maxWidth: 560 }}>
      <p style={{ marginBottom: 16 }}>
        <Link href={listUrl}>← Lessons</Link>
      </p>
      <h1 style={{ fontSize: 22, marginTop: 0 }}>Lesson</h1>
      <p style={{ fontSize: 15, opacity: 0.9 }}>
        <strong>{formatIsoDateTime(lesson.startsAt)}</strong>
        {" → "}
        <strong>{formatIsoDateTime(lesson.endsAt)}</strong>
      </p>
      <p style={{ fontSize: 15 }}>
        Status: <strong>{lesson.status}</strong>
      </p>
      <ul style={{ fontSize: 15, lineHeight: 1.6, paddingLeft: 20 }}>
        <li>Student: {studentLabel}</li>
        <li>Subject: {subjectLabel}</li>
        <li>Tutor: {tutorLabel}</li>
        <li>
          Notes:{" "}
          {lesson.notes === null || lesson.notes === ""
            ? "—"
            : lesson.notes}
        </li>
      </ul>

      {canTryLifecycle ? (
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button
            type="button"
            onClick={() => void onComplete()}
            disabled={!canCompleteOrCancel || mutating}
          >
            {completeMut.isPending ? "Completing…" : "Mark complete"}
          </button>
          <button
            type="button"
            onClick={() => void onCancel()}
            disabled={!canCompleteOrCancel || mutating}
          >
            {cancelMut.isPending ? "Cancelling…" : "Cancel lesson"}
          </button>
        </div>
      ) : null}

      {terminal && canTryLifecycle ? (
        <p style={{ fontSize: 14, opacity: 0.8, marginTop: 12 }}>
          This lesson is finished; complete and cancel are not available.
        </p>
      ) : null}

      {actionError ? (
        <p style={{ color: "#b91c1c", marginTop: 12 }}>{actionError}</p>
      ) : null}

      {isAdmin ? (
        <p style={{ marginTop: 20 }}>
          {canEdit ? (
            <Link href={`${base}/${lesson.id}/edit`}>Edit lesson</Link>
          ) : (
            <span style={{ fontSize: 14, opacity: 0.85 }}>
              Only scheduled lessons can be edited.
            </span>
          )}
        </p>
      ) : null}
    </main>
  );
}
