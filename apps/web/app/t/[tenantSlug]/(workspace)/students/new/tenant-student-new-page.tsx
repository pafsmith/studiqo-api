"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import { useCreateStudentMutation } from "@/lib/api/students-query";
import { useOrganizationMembersQuery } from "@/lib/api/organization-members-query";
import { formatOrgMemberOptionLabel } from "@/lib/format-org-member";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  createStudentFormSchema,
  type CreateStudentForm,
} from "@/lib/validation/student-forms";

const OPTIONAL_TUTOR_NONE = "__none__";

export function TenantStudentNewPage() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params.tenantSlug;
  const router = useRouter();
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );
  const { data: members, isLoading: membersLoading } =
    useOrganizationMembersQuery(organizationId, canManage);
  const createStudent = useCreateStudentMutation(organizationId ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<CreateStudentForm>({
    resolver: zodResolver<CreateStudentForm>(createStudentFormSchema),
    defaultValues: {
      parentId: "",
      tutorId: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
    },
  });

  const parents =
    members?.filter((m) => m.role === "parent") ?? [];
  const tutors =
    members?.filter((m) => m.role === "tutor") ?? [];

  const base = `/t/${tenantSlug}/students`;

  if (!canManage) {
    return (
      <main className="flex max-w-lg flex-col gap-4">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          New student
        </h1>
        <p className="text-sm text-muted-foreground">
          Only organization admins can create students.
        </p>
        <Button variant="link" asChild className="h-auto w-fit p-0">
          <Link href={base}>Back to students</Link>
        </Button>
      </main>
    );
  }

  if (orgsLoading || !organizationId) {
    return (
      <main className="flex max-w-lg flex-col gap-4">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          New student
        </h1>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  async function onSubmit(values: CreateStudentForm) {
    setFormError(null);
    try {
      const body = {
        parentId: values.parentId,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        ...(values.tutorId && values.tutorId !== ""
          ? { tutorId: values.tutorId }
          : {}),
      };
      const student = await createStudent.mutateAsync(body);
      router.push(`${base}/${student.id}`);
    } catch (e) {
      if (isStudiqoApiError(e)) setFormError(e.message);
      else setFormError("Could not create student");
    }
  }

  return (
    <main className="flex max-w-lg flex-col gap-6">
      <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
        <Link href={base}>← Students</Link>
      </Button>
      <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
        New student
      </h1>

      {membersLoading ? (
        <p className="text-sm text-muted-foreground">Loading members…</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Student details</CardTitle>
          <CardDescription>
            Link a parent member and optional tutor, then add name and date of
            birth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <Label htmlFor="new-student-parent">Parent (member)</Label>
              <Controller
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    disabled={membersLoading}
                  >
                    <SelectTrigger
                      id="new-student-parent"
                      className="w-full"
                      aria-invalid={!!form.formState.errors.parentId}
                    >
                      <SelectValue placeholder="Select parent user…" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {formatOrgMemberOptionLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.parentId ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.parentId.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-student-tutor">Tutor (optional)</Label>
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
                    <SelectTrigger id="new-student-tutor" className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={OPTIONAL_TUTOR_NONE}>None</SelectItem>
                      {tutors.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {formatOrgMemberOptionLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-student-first">First name</Label>
              <Input
                id="new-student-first"
                {...form.register("firstName")}
                autoComplete="given-name"
              />
              {form.formState.errors.firstName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.firstName.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-student-last">Last name</Label>
              <Input
                id="new-student-last"
                {...form.register("lastName")}
                autoComplete="family-name"
              />
              {form.formState.errors.lastName ? (
                <p className="text-xs text-destructive">
                  {form.formState.errors.lastName.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="new-student-dob">Date of birth</Label>
              <Input
                id="new-student-dob"
                type="date"
                {...form.register("dateOfBirth")}
              />
              {form.formState.errors.dateOfBirth ? (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.dateOfBirth.message)}
                </p>
              ) : null}
            </div>

            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              type="submit"
              disabled={createStudent.isPending || membersLoading}
              className="w-fit"
            >
              {createStudent.isPending ? "Creating…" : "Create student"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
