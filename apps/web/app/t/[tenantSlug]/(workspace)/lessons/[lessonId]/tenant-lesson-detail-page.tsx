"use client";

import type { components } from "@studiqo/api-client/generated";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

import {
  LessonPageHeader,
  LessonSummaryCard,
} from "../_components/lesson-ui";

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
      <main className="flex max-w-2xl flex-col gap-4">
        <LessonPageHeader backHref={listUrl} title="Lesson" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  if (lessonQ.isLoading) {
    return (
      <main className="flex max-w-2xl flex-col gap-4">
        <LessonPageHeader backHref={listUrl} title="Lesson" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  if (lessonQ.error) {
    return (
      <main className="flex max-w-2xl flex-col gap-4">
        <LessonPageHeader backHref={listUrl} title="Lesson" />
        <Alert variant="destructive">
          <AlertDescription>
            {lessonQ.error instanceof Error
              ? lessonQ.error.message
              : "Could not load lesson"}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const lesson = lessonQ.data;
  if (!lesson) {
    return (
      <main className="flex max-w-2xl flex-col gap-4">
        <LessonPageHeader backHref={listUrl} title="Lesson" />
        <Alert variant="destructive">
          <AlertDescription>Lesson not found.</AlertDescription>
        </Alert>
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
  const metadataError =
    studentsQ.error ?? subjectsQ.error ?? membersQ.error ?? null;

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
    <main className="flex max-w-2xl flex-col gap-6">
      <LessonPageHeader
        backHref={listUrl}
        title="Lesson"
        description={
          <>
            <span>{formatIsoDateTime(lesson.startsAt)}</span>
            <span> → </span>
            <span>{formatIsoDateTime(lesson.endsAt)}</span>
          </>
        }
        actions={
          canEdit ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/${lesson.id}/edit`}>Edit lesson</Link>
            </Button>
          ) : null
        }
      />

      {studentsQ.isLoading || subjectsQ.isLoading || membersQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading lesson metadata…</p>
      ) : null}

      {metadataError ? (
        <Alert>
          <AlertDescription>
            Some related lesson labels could not be loaded. Stored ids will be
            shown where needed.
          </AlertDescription>
        </Alert>
      ) : null}

      <LessonSummaryCard
        startsAt={lesson.startsAt}
        endsAt={lesson.endsAt}
        status={lesson.status}
        studentLabel={studentLabel}
        subjectLabel={subjectLabel}
        tutorLabel={tutorLabel}
        notes={lesson.notes}
      />

      {(canTryLifecycle || isAdmin || actionError) && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Actions</CardTitle>
            <CardDescription>
              Update the lesson lifecycle once the session outcome is known.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            {canTryLifecycle ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void onComplete()}
                  disabled={!canCompleteOrCancel || mutating}
                >
                  {completeMut.isPending ? "Completing…" : "Mark complete"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void onCancel()}
                  disabled={!canCompleteOrCancel || mutating}
                >
                  {cancelMut.isPending ? "Cancelling…" : "Cancel lesson"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lesson lifecycle updates are only available to organization
                admins and tutors.
              </p>
            )}

            {terminal && canTryLifecycle ? (
              <p className="text-sm text-muted-foreground">
                This lesson is finished; complete and cancel are not available.
              </p>
            ) : null}

            {isAdmin && !canEdit ? (
              <p className="text-sm text-muted-foreground">
                Only scheduled lessons can be edited.
              </p>
            ) : null}

            {actionError ? (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
