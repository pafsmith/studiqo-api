"use client";

import type { components } from "@studiqo/api-client/generated";
import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

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

import {
  LessonField,
  LessonFormCard,
  LessonFormPage,
  LessonTextarea,
} from "../../_components/lesson-form";

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
    resolver: zodResolver<UpdateLessonForm>(updateLessonFormSchema),
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
  const detailUrl = `${base}/${lessonId}`;

  if (!canManage) {
    return (
      <LessonFormPage title="Edit lesson" backHref={detailUrl} backLabel="Lesson">
        <Alert>
          <AlertDescription>
            Only organization admins can edit lessons.
          </AlertDescription>
        </Alert>
      </LessonFormPage>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <LessonFormPage
        title="Edit lesson"
        backHref={detailUrl}
        backLabel="Lesson"
        description="Update schedule details, tutor assignment, subject, or notes."
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </LessonFormPage>
    );
  }

  if (lessonQ.isLoading) {
    return (
      <LessonFormPage
        title="Edit lesson"
        backHref={detailUrl}
        backLabel="Lesson"
        description="Update schedule details, tutor assignment, subject, or notes."
      >
        <p className="text-sm text-muted-foreground">Loading lesson…</p>
      </LessonFormPage>
    );
  }

  if (lessonQ.error || !lesson) {
    return (
      <LessonFormPage title="Edit lesson" backHref={base}>
        <Alert variant="destructive">
          <AlertDescription>
            {lessonQ.error instanceof Error
              ? lessonQ.error.message
              : "Could not load lesson"}
          </AlertDescription>
        </Alert>
      </LessonFormPage>
    );
  }

  if (lesson.status !== "scheduled") {
    return (
      <LessonFormPage
        title="Edit lesson"
        backHref={detailUrl}
        backLabel="Lesson"
      >
        <Alert>
          <AlertDescription>
            Only scheduled lessons can be edited. This lesson is{" "}
            <strong>{lesson.status}</strong>.
          </AlertDescription>
        </Alert>
      </LessonFormPage>
    );
  }

  const editingLesson = lesson;
  const tutors = membersQ.data?.filter((m) => m.role === "tutor") ?? [];
  const referenceError = subjectsQ.error ?? membersQ.error ?? null;
  const loadingRefs = subjectsQ.isLoading || membersQ.isLoading;

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

  if (referenceError) {
    return (
      <LessonFormPage
        title="Edit lesson"
        backHref={detailUrl}
        backLabel="Lesson"
        description="Update schedule details, tutor assignment, subject, or notes."
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

  return (
    <LessonFormPage
      title="Edit lesson"
      backHref={`${base}/${lesson.id}`}
      backLabel="Lesson"
      description="Update schedule details, tutor assignment, subject, or notes."
    >
      {loadingRefs ? (
        <p className="text-sm text-muted-foreground">Loading references…</p>
      ) : null}

      <LessonFormCard
        title="Lesson details"
        description="Only changed fields are sent to the API."
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <LessonField label="Tutor" htmlFor="edit-lesson-tutor">
            <Controller
              control={form.control}
              name="tutorId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={loadingRefs}
                >
                  <SelectTrigger id="edit-lesson-tutor" className="w-full">
                    <SelectValue placeholder="Select tutor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {tutors.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {formatOrgMemberOptionLabel(member)}
                      </SelectItem>
                    ))}
                    {!tutors.some((member) => member.userId === editingLesson.tutorId) ? (
                      <SelectItem value={editingLesson.tutorId}>
                        Current tutor (id {editingLesson.tutorId.slice(0, 8)}…)
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            />
          </LessonField>

          <LessonField label="Subject" htmlFor="edit-lesson-subject">
            <Controller
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={loadingRefs}
                >
                  <SelectTrigger id="edit-lesson-subject" className="w-full">
                    <SelectValue placeholder="Select subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(subjectsQ.data ?? []).map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                    {!subjectsQ.data?.some((subject) => subject.id === editingLesson.subjectId) ? (
                      <SelectItem value={editingLesson.subjectId}>
                        Current subject (id {editingLesson.subjectId.slice(0, 8)}…)
                      </SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              )}
            />
          </LessonField>

          <LessonField
            label="Starts"
            htmlFor="edit-lesson-starts"
            error={form.formState.errors.startsAtLocal?.message}
          >
            <Input
              id="edit-lesson-starts"
              type="datetime-local"
              {...form.register("startsAtLocal")}
              aria-invalid={!!form.formState.errors.startsAtLocal}
            />
          </LessonField>

          <LessonField
            label="Ends"
            htmlFor="edit-lesson-ends"
            error={form.formState.errors.endsAtLocal?.message}
          >
            <Input
              id="edit-lesson-ends"
              type="datetime-local"
              {...form.register("endsAtLocal")}
              aria-invalid={!!form.formState.errors.endsAtLocal}
            />
          </LessonField>

          <LessonField label="Notes" htmlFor="edit-lesson-notes">
            <LessonTextarea
              id="edit-lesson-notes"
              rows={4}
              {...form.register("notes")}
            />
          </LessonField>

          {form.formState.errors.root?.message ? (
            <Alert variant="destructive">
              <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
            </Alert>
          ) : null}

          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Button
            type="submit"
            disabled={updateLesson.isPending || loadingRefs}
            className="w-fit"
          >
            {updateLesson.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </LessonFormCard>
    </LessonFormPage>
  );
}
