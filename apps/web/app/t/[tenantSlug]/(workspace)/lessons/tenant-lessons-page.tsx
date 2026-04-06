"use client";

import type { components } from "@studiqo/api-client/generated";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLessonsListQuery } from "@/lib/api/lessons-query";
import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import { useStudentsListQuery } from "@/lib/api/students-query";
import { useSubjectsListQuery } from "@/lib/api/subjects-query";
import {
  endOfIsoWeekLocal,
  formatIsoDateTime,
  startOfIsoWeekLocal,
} from "@/lib/datetime";
import { formatOrgMemberOptionLabel } from "@/lib/format-org-member";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import { lessonListRangeSchema } from "@/lib/validation/lesson-forms";

import { LessonPageHeader, LessonStatusBadge } from "./_components/lesson-ui";

type Student = components["schemas"]["Student"];
type Subject = components["schemas"]["Subject"];
type OrgMember = components["schemas"]["OrganizationMembership"];

const ALL_STUDENTS = "__all_students__";
const ALL_TUTORS = "__all_tutors__";

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function TenantLessonsPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [studentFilter, setStudentFilter] = useState("");
  const [tutorFilter, setTutorFilter] = useState("");

  const isAdmin = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const canUseTutorFilter = isAdmin;

  const fromDate = useMemo(() => startOfIsoWeekLocal(weekAnchor), [weekAnchor]);
  const toDate = useMemo(() => endOfIsoWeekLocal(weekAnchor), [weekAnchor]);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const rangeParsed = lessonListRangeSchema.safeParse({ fromIso, toIso });
  const rangeValid = rangeParsed.success;

  const listFilters =
    rangeValid && organizationId
      ? {
          from: fromIso,
          to: toIso,
          ...(studentFilter ? { studentId: studentFilter } : {}),
          ...(canUseTutorFilter && tutorFilter ? { tutorId: tutorFilter } : {}),
        }
      : null;

  const studentsQ = useStudentsListQuery(organizationId);
  const subjectsQ = useSubjectsListQuery(organizationId);
  const membersQ = useOrganizationMembersQuery(organizationId, canUseTutorFilter);
  const lessonsQ = useLessonsListQuery(organizationId, listFilters, rangeValid);

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

  const tutorByUserId = useMemo(() => {
    const m = new Map<string, OrgMember>();
    for (const mem of membersQ.data ?? []) {
      if (mem.role === "tutor") {
        m.set(mem.userId, mem);
      }
    }
    return m;
  }, [membersQ.data]);

  const sortedLessons = useMemo(() => {
    const list = lessonsQ.data ?? [];
    return [...list].sort(
      (a, b) =>
        new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [lessonsQ.data]);

  const base = `/t/${tenantSlug}/lessons`;
  const tutors = membersQ.data?.filter((m) => m.role === "tutor") ?? [];
  const referenceError =
    studentsQ.error ?? subjectsQ.error ?? membersQ.error ?? null;
  const loadingReferences =
    studentsQ.isLoading || subjectsQ.isLoading || membersQ.isLoading;

  if (orgsLoading || !organizationId) {
    return (
      <main className="flex flex-col gap-4">
        <LessonPageHeader title="Lessons" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col gap-6">
      <LessonPageHeader
        title="Lessons"
        description="Review the current week, filter by student or tutor, and open a lesson to manage its lifecycle."
        actions={
          isAdmin ? (
            <Button size="sm" asChild>
              <Link href={`${base}/new`}>New lesson</Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Week view</CardTitle>
          <CardDescription>
            Navigate the current lesson window and narrow the list by student or
            tutor.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeekAnchor((d) => addDays(d, -7))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeekAnchor(new Date())}
            >
              This week
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWeekAnchor((d) => addDays(d, 7))}
            >
              Next
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Showing {formatIsoDateTime(fromIso)} to {formatIsoDateTime(toIso)}.
          </p>

          {!rangeValid ? (
            <Alert variant="destructive">
              <AlertDescription>
                {rangeParsed.success ? null : rangeParsed.error.issues[0]?.message}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lessons-student-filter">Student</Label>
              <Select
                value={studentFilter || ALL_STUDENTS}
                onValueChange={(value) =>
                  setStudentFilter(value === ALL_STUDENTS ? "" : value)
                }
                disabled={studentsQ.isLoading}
              >
                <SelectTrigger id="lessons-student-filter" className="w-full">
                  <SelectValue placeholder="All students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STUDENTS}>All students</SelectItem>
                  {(studentsQ.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canUseTutorFilter ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="lessons-tutor-filter">Tutor</Label>
                <Select
                  value={tutorFilter || ALL_TUTORS}
                  onValueChange={(value) =>
                    setTutorFilter(value === ALL_TUTORS ? "" : value)
                  }
                  disabled={membersQ.isLoading}
                >
                  <SelectTrigger id="lessons-tutor-filter" className="w-full">
                    <SelectValue placeholder="All tutors" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TUTORS}>All tutors</SelectItem>
                    {tutors.map((t) => (
                      <SelectItem key={t.userId} value={t.userId}>
                        {formatOrgMemberOptionLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          {loadingReferences ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-12 w-full" />
              {canUseTutorFilter ? <Skeleton className="h-12 w-full" /> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {referenceError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {referenceError instanceof Error
              ? referenceError.message
              : "Some lesson metadata could not be loaded"}
          </AlertDescription>
        </Alert>
      ) : null}

      {lessonsQ.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {lessonsQ.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {lessonsQ.error instanceof Error
              ? lessonsQ.error.message
              : "Could not load lessons"}
          </AlertDescription>
        </Alert>
      ) : null}

      {!lessonsQ.isLoading &&
      !lessonsQ.error &&
      rangeValid &&
      sortedLessons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <p className="m-0 max-w-prose text-sm text-muted-foreground">
              No lessons are scheduled in this range.
            </p>
            {isAdmin ? (
              <Button size="sm" asChild className="w-fit">
                <Link href={`${base}/new`}>Schedule a lesson</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {!lessonsQ.isLoading && !lessonsQ.error && sortedLessons.length > 0 ? (
        <Card className="py-0">
          <CardContent className="flex flex-col gap-0 px-0 py-0">
            {sortedLessons.map((lesson) => {
              const stu = studentById.get(lesson.studentId);
              const sub = subjectById.get(lesson.subjectId);
              const tut = tutorByUserId.get(lesson.tutorId);
              const studentLabel = stu
                ? `${stu.firstName} ${stu.lastName}`
                : lesson.studentId;
              const subjectLabel = sub?.name ?? lesson.subjectId;
              const tutorLabel = tut?.email ?? lesson.tutorId;

              return (
                <div
                  key={lesson.id}
                  className="border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-muted/30"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`${base}/${lesson.id}`}
                        className="text-base font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {formatIsoDateTime(lesson.startsAt)} →{" "}
                        {formatIsoDateTime(lesson.endsAt)}
                      </Link>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {studentLabel} · {subjectLabel} · {tutorLabel}
                      </p>
                    </div>
                    <LessonStatusBadge status={lesson.status} className="self-start" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
