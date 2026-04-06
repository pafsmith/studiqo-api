"use client";

import { zodResolver } from "@/lib/zod-resolver";
import type { components } from "@studiqo/api-client/generated";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const OPTIONAL_TUTOR_NONE = "__none__";

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
    resolver: zodResolver<UpdateStudentForm>(updateStudentFormSchema),
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
      <main className="flex max-w-lg flex-col gap-4">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Edit student
        </h1>
        <p className="text-sm text-muted-foreground">
          Only organization admins can edit students.
        </p>
        <Button variant="link" asChild className="h-auto w-fit p-0">
          <Link href={detailUrl}>Back</Link>
        </Button>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main className="flex max-w-lg flex-col gap-4">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Edit student
        </h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
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
      <main className="flex max-w-lg flex-col gap-4">
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={base}>← Students</Link>
        </Button>
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Edit student
        </h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (!student) {
    return (
      <main className="flex max-w-lg flex-col gap-4">
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={base}>← Students</Link>
        </Button>
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Edit student
        </h1>
        <p className="text-sm text-muted-foreground">Student not found.</p>
      </main>
    );
  }

  return (
    <main className="flex max-w-lg flex-col gap-6">
      <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
        <Link href={detailUrl}>
          ← {student.firstName} {student.lastName}
        </Link>
      </Button>
      <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
        Edit student
      </h1>
      <p className="text-sm text-muted-foreground">
        Born {formatIsoDate(student.dateOfBirth)}
      </p>

      {membersLoading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Membership & profile</CardTitle>
          <CardDescription>
            Update parent, tutor, name, or date of birth. Unchanged fields are
            not sent to the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-student-parent">Parent</Label>
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={membersLoading}
                  >
                    <SelectTrigger id="edit-student-parent" className="w-full">
                      <SelectValue placeholder="Select parent…" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {formatOrgMemberOptionLabel(m)}
                        </SelectItem>
                      ))}
                      {student &&
                      !parents.some((m) => m.userId === student.parentId) ? (
                        <SelectItem value={student.parentId}>
                          Current parent (id {student.parentId.slice(0, 8)}…)
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-student-tutor">Tutor</Label>
              <Controller
                control={form.control}
                name="tutorId"
                render={({ field }) => (
                  <Select
                    value={
                      field.value === "" ? OPTIONAL_TUTOR_NONE : field.value
                    }
                    onValueChange={(v) =>
                      field.onChange(
                        v === OPTIONAL_TUTOR_NONE ? "" : v,
                      )
                    }
                    disabled={membersLoading}
                  >
                    <SelectTrigger id="edit-student-tutor" className="w-full">
                      <SelectValue placeholder="No tutor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OPTIONAL_TUTOR_NONE}>
                        No tutor
                      </SelectItem>
                      {tutors.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {formatOrgMemberOptionLabel(m)}
                        </SelectItem>
                      ))}
                      {student.tutorId &&
                      !tutors.some((m) => m.userId === student.tutorId) ? (
                        <SelectItem value={student.tutorId}>
                          Current tutor (id {student.tutorId.slice(0, 8)}…)
                        </SelectItem>
                      ) : null}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-student-first">First name</Label>
              <Input id="edit-student-first" {...form.register("firstName")} />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-student-last">Last name</Label>
              <Input id="edit-student-last" {...form.register("lastName")} />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="edit-student-dob">Date of birth</Label>
              <Input
                id="edit-student-dob"
                type="date"
                {...form.register("dateOfBirth")}
              />
            </div>

            {form.formState.errors.root ? (
              <p className="text-xs text-destructive">
                {form.formState.errors.root.message}
              </p>
            ) : null}

            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={updateStudent.isPending}
              className="w-fit"
            >
              {updateStudent.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
