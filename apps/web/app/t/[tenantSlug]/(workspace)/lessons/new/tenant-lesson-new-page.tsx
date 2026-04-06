"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import {
  LessonField,
  LessonFormCard,
  LessonFormPage,
} from "../_components/lesson-form";

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
    resolver: zodResolver<CreateLessonForm>(createLessonFormSchema),
    defaultValues: {
      studentId: "",
      subjectId: "",
      startsAtLocal: defaults.start,
      endsAtLocal: defaults.end,
    },
  });

  const studentId = useWatch({
    control: form.control,
    name: "studentId",
  });
  const students = studentsQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const selectedStudent = students.find((s) => s.id === studentId);

  const base = `/t/${tenantSlug}/lessons`;
  const referenceError = studentsQ.error ?? subjectsQ.error ?? null;
  const loadingRefs = studentsQ.isLoading || subjectsQ.isLoading;
  const missingReferences = students.length === 0 || subjects.length === 0;

  if (!canManage) {
    return (
      <LessonFormPage title="New lesson" backHref={base}>
        <Alert>
          <AlertDescription>
            Only organization admins can create lessons.
          </AlertDescription>
        </Alert>
      </LessonFormPage>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <LessonFormPage
        title="New lesson"
        backHref={base}
        description="Set the student, subject, and time window for a new lesson."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </LessonFormPage>
    );
  }

  if (referenceError) {
    return (
      <LessonFormPage
        title="New lesson"
        backHref={base}
        description="Set the student, subject, and time window for a new lesson."
      >
        <Alert variant="destructive">
          <AlertDescription>
            {referenceError instanceof Error
              ? referenceError.message
              : "Could not load lesson references"}
          </AlertDescription>
        </Alert>
      </LessonFormPage>
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

  return (
    <LessonFormPage
      title="New lesson"
      backHref={base}
      description="Set the student, subject, and time window for a new lesson."
    >
      {loadingRefs ? (
        <p className="text-sm text-muted-foreground">Loading references…</p>
      ) : null}

      {missingReferences ? (
        <Alert>
          <AlertDescription>
            Add at least one student and one subject before scheduling a
            lesson.
          </AlertDescription>
        </Alert>
      ) : null}

      <LessonFormCard
        title="Schedule lesson"
        description="The assigned tutor is taken from the selected student record."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <LessonField
            label="Student"
            htmlFor="new-lesson-student"
            error={form.formState.errors.studentId?.message}
          >
            <Controller
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={loadingRefs || students.length === 0}
                >
                  <SelectTrigger
                    id="new-lesson-student"
                    className="w-full"
                    aria-invalid={!!form.formState.errors.studentId}
                  >
                    <SelectValue placeholder="Select student…" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.firstName} {student.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </LessonField>

          {selectedStudent && !selectedStudent.tutorId ? (
            <Alert>
              <AlertDescription>
                This student has no assigned tutor. Update the student before
                creating a lesson.
              </AlertDescription>
            </Alert>
          ) : null}

          <LessonField
            label="Subject"
            htmlFor="new-lesson-subject"
            hint={
              selectedStudent?.tutorId
                ? "Tutor for this lesson comes from the student's assigned tutor."
                : undefined
            }
            error={form.formState.errors.subjectId?.message}
          >
            <Controller
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={loadingRefs || subjects.length === 0}
                >
                  <SelectTrigger
                    id="new-lesson-subject"
                    className="w-full"
                    aria-invalid={!!form.formState.errors.subjectId}
                  >
                    <SelectValue placeholder="Select subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </LessonField>

          <LessonField
            label="Starts"
            htmlFor="new-lesson-starts"
            error={form.formState.errors.startsAtLocal?.message}
          >
            <Input
              id="new-lesson-starts"
              type="datetime-local"
              {...form.register("startsAtLocal")}
              aria-invalid={!!form.formState.errors.startsAtLocal}
            />
          </LessonField>

          <LessonField
            label="Ends"
            htmlFor="new-lesson-ends"
            error={form.formState.errors.endsAtLocal?.message}
          >
            <Input
              id="new-lesson-ends"
              type="datetime-local"
              {...form.register("endsAtLocal")}
              aria-invalid={!!form.formState.errors.endsAtLocal}
            />
          </LessonField>

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={createLesson.isPending || loadingRefs || missingReferences}
            className="w-fit"
          >
            {createLesson.isPending ? "Creating…" : "Create lesson"}
          </Button>
        </form>
      </LessonFormCard>
    </LessonFormPage>
  );
}
