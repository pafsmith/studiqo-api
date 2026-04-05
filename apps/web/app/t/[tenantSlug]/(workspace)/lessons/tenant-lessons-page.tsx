"use client";

import type { components } from "@studiqo/api-client/generated";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

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

type Student = components["schemas"]["Student"];
type Subject = components["schemas"]["Subject"];
type OrgMember = components["schemas"]["OrganizationMembership"];

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

  if (orgsLoading || !organizationId) {
    return (
      <main>
        <h1 style={{ fontSize: 22 }}>Lessons</h1>
        <p>Loading…</p>
      </main>
    );
  }

  return (
    <main>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>Lessons</h1>
        {isAdmin ? (
          <Link href={`${base}/new`} style={{ fontSize: 15 }}>
            New lesson
          </Link>
        ) : null}
      </div>

      <section
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.85 }}>Week</span>
        <button
          type="button"
          onClick={() => setWeekAnchor((d) => addDays(d, -7))}
          style={{ fontSize: 14 }}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => setWeekAnchor(new Date())}
          style={{ fontSize: 14 }}
        >
          This week
        </button>
        <button
          type="button"
          onClick={() => setWeekAnchor((d) => addDays(d, 7))}
          style={{ fontSize: 14 }}
        >
          Next
        </button>
        <span style={{ fontSize: 13, opacity: 0.75 }}>
          {formatIsoDateTime(fromIso)} – {formatIsoDateTime(toIso)}
        </span>
      </section>

      {!rangeValid ? (
        <p style={{ color: "#b91c1c", marginTop: 12 }}>
          {rangeParsed.success ? null : rangeParsed.error.issues[0]?.message}
        </p>
      ) : null}

      <div
        style={{
          marginTop: 16,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "flex-end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13 }}>Student</span>
          <select
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            style={{ minWidth: 200, fontSize: 14 }}
          >
            <option value="">All</option>
            {(studentsQ.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </label>
        {canUseTutorFilter ? (
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13 }}>Tutor</span>
            <select
              value={tutorFilter}
              onChange={(e) => setTutorFilter(e.target.value)}
              style={{ minWidth: 220, fontSize: 14 }}
            >
              <option value="">All</option>
              {tutors.map((t) => (
                <option key={t.userId} value={t.userId}>
                  {formatOrgMemberOptionLabel(t)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {studentsQ.isLoading || subjectsQ.isLoading || membersQ.isLoading ? (
        <p style={{ marginTop: 16 }}>Loading filters…</p>
      ) : null}

      {lessonsQ.isLoading ? <p style={{ marginTop: 16 }}>Loading lessons…</p> : null}
      {lessonsQ.error ? (
        <p style={{ color: "#b91c1c", marginTop: 16 }}>
          {lessonsQ.error instanceof Error
            ? lessonsQ.error.message
            : "Could not load lessons"}
        </p>
      ) : null}

      {!lessonsQ.isLoading &&
      !lessonsQ.error &&
      rangeValid &&
      sortedLessons.length === 0 ? (
        <p style={{ opacity: 0.85, marginTop: 16 }}>
          No lessons in this range.
          {isAdmin ? (
            <>
              {" "}
              <Link href={`${base}/new`}>Schedule one</Link>.
            </>
          ) : null}
        </p>
      ) : null}

      {!lessonsQ.isLoading && !lessonsQ.error && sortedLessons.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 16 }}>
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
              <li
                key={lesson.id}
                style={{
                  borderBottom: "1px solid #eee",
                  padding: "12px 0",
                }}
              >
                <Link
                  href={`${base}/${lesson.id}`}
                  style={{ fontSize: 16, fontWeight: 600 }}
                >
                  {formatIsoDateTime(lesson.startsAt)} →{" "}
                  {formatIsoDateTime(lesson.endsAt)}
                </Link>
                <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                  {studentLabel} · {subjectLabel} · {tutorLabel}
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  Status: <strong>{lesson.status}</strong>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </main>
  );
}
