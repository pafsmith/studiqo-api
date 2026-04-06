"use client";

import { zodResolver } from "@/lib/zod-resolver";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  useCreateEmergencyContactMutation,
  useDeleteEmergencyContactMutation,
  useDeleteStudentMutation,
  useLinkStudentSubjectMutation,
  useStudentDetailQuery,
  useStudentEmergencyContactsQuery,
  useStudentSubjectsQuery,
  useUpdateEmergencyContactMutation,
} from "@/lib/api/students-query";
import {
  useCreateSubjectMutation,
  useSubjectsListQuery,
} from "@/lib/api/subjects-query";
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
import { formatIsoDate, formatIsoDateTime } from "@/lib/datetime";
import { useTenantOrganizationId } from "@/lib/hooks/use-tenant-organization";
import { useSession } from "@/lib/auth/session";
import { isOrgAdminOrSuperadmin } from "@/lib/tenant-role";
import {
  createEmergencyContactFormSchema,
  createSubjectFormSchema,
  linkStudentSubjectFormSchema,
  updateEmergencyContactFormSchema,
  type CreateEmergencyContactForm,
  type CreateSubjectForm,
  type LinkStudentSubjectForm,
  type UpdateEmergencyContactForm,
} from "@/lib/validation/student-forms";

export function TenantStudentDetailPage() {
  const params = useParams<{ tenantSlug: string; studentId: string }>();
  const { tenantSlug, studentId } = params;
  const { user } = useSession();
  const { organizationId, orgsLoading } = useTenantOrganizationId(tenantSlug);
  const canManage = isOrgAdminOrSuperadmin(
    user?.role,
    user?.isSuperadmin ?? false,
  );

  const studentQ = useStudentDetailQuery(organizationId, studentId);
  const subjectsQ = useStudentSubjectsQuery(organizationId, studentId);
  const contactsQ = useStudentEmergencyContactsQuery(organizationId, studentId);
  const orgSubjectsQ = useSubjectsListQuery(organizationId);

  const linkSubject = useLinkStudentSubjectMutation(organizationId ?? "");
  const createContact = useCreateEmergencyContactMutation();
  const updateContact = useUpdateEmergencyContactMutation(organizationId ?? "");
  const deleteContact = useDeleteEmergencyContactMutation();
  const deleteStudent = useDeleteStudentMutation(organizationId ?? "");
  const createSubject = useCreateSubjectMutation(organizationId ?? "");

  const enrolledSubjectIds = useMemo(
    () => new Set(subjectsQ.data?.map((s) => s.subjectId) ?? []),
    [subjectsQ.data],
  );

  const base = `/t/${tenantSlug}/students`;
  const listUrl = base;

  if (orgsLoading || !organizationId) {
    return (
      <main className="flex flex-col gap-4">
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={listUrl}>← Students</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  if (studentQ.isLoading) {
    return (
      <main className="flex flex-col gap-4">
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={listUrl}>← Students</Link>
        </Button>
        <p className="text-sm text-muted-foreground">Loading student…</p>
      </main>
    );
  }

  if (studentQ.error || !studentQ.data) {
    return (
      <main className="flex flex-col gap-4">
        <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
          <Link href={listUrl}>← Students</Link>
        </Button>
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          Student
        </h1>
        <Alert variant="destructive">
          <AlertDescription>
            {studentQ.error instanceof Error
              ? studentQ.error.message
              : "Student not found or access denied."}
          </AlertDescription>
        </Alert>
      </main>
    );
  }

  const student = studentQ.data;

  return (
    <main className="flex flex-col gap-8">
      <Button variant="link" asChild className="h-auto w-fit justify-start p-0">
        <Link href={listUrl}>← Students</Link>
      </Button>

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground">
          {student.firstName} {student.lastName}
        </h1>
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`${base}/${studentId}/edit`}>Edit</Link>
            </Button>
            <DeleteStudentButton
              listUrl={listUrl}
              onDelete={() => deleteStudent.mutateAsync(studentId)}
              disabled={deleteStudent.isPending}
            />
          </div>
        ) : null}
      </div>

      <p className="text-base text-muted-foreground">
        Born {formatIsoDate(student.dateOfBirth)}
      </p>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            Linked subjects and grade notes for this student.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          {subjectsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading subjects…</p>
          ) : null}
          {subjectsQ.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {subjectsQ.error instanceof Error
                  ? subjectsQ.error.message
                  : "Could not load subjects"}
              </AlertDescription>
            </Alert>
          ) : null}
          {subjectsQ.data && subjectsQ.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects linked yet.
            </p>
          ) : null}
          {subjectsQ.data && subjectsQ.data.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {subjectsQ.data.map((row) => (
                <li key={row.subjectId} className="text-foreground">
                  <strong className="font-semibold">{row.subjectName}</strong>
                  {row.currentGrade != null || row.predictedGrade != null ? (
                    <span className="text-muted-foreground">
                      {" "}
                      — current: {row.currentGrade ?? "—"}, predicted:{" "}
                      {row.predictedGrade ?? "—"}
                    </span>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    Updated {formatIsoDateTime(row.updatedAt)}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          {canManage ? (
            <LinkSubjectBlock
              studentId={studentId}
              orgSubjects={orgSubjectsQ.data ?? []}
              enrolledIds={enrolledSubjectIds}
              linkSubject={linkSubject}
              createSubject={createSubject}
              subjectsLoading={orgSubjectsQ.isLoading}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Emergency contacts</CardTitle>
          <CardDescription>
            Up to two contacts on file for this student.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          {contactsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading contacts…</p>
          ) : null}
          {contactsQ.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {contactsQ.error instanceof Error
                  ? contactsQ.error.message
                  : "Could not load contacts"}
              </AlertDescription>
            </Alert>
          ) : null}
          {contactsQ.data && contactsQ.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emergency contacts on file.
            </p>
          ) : null}
          {contactsQ.data?.map((c) => (
            <EmergencyContactRow
              key={c.id}
              contact={c}
              studentId={studentId}
              canManage={canManage}
              updateContact={updateContact}
              deleteContact={deleteContact}
            />
          ))}

          {canManage ? (
            <AddEmergencyContactForm
              studentId={studentId}
              createContact={createContact}
              contactCount={contactsQ.data?.length ?? 0}
            />
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}

function DeleteStudentButton({
  listUrl,
  onDelete,
  disabled,
}: {
  listUrl: string;
  onDelete: () => Promise<void>;
  disabled: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!confirmOpen) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </Button>
    );
  }

  return (
    <span className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground">
        Delete this student?
      </span>
      {err ? (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <span className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setErr(null);
            void (async () => {
              try {
                await onDelete();
                router.push(listUrl);
              } catch (e) {
                if (isStudiqoApiError(e)) setErr(e.message);
                else setErr("Could not delete");
              }
            })();
          }}
        >
          {disabled ? "Deleting…" : "Confirm delete"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setConfirmOpen(false);
            setErr(null);
          }}
        >
          Cancel
        </Button>
      </span>
    </span>
  );
}

function LinkSubjectBlock({
  studentId,
  orgSubjects,
  enrolledIds,
  linkSubject,
  createSubject,
  subjectsLoading,
}: {
  studentId: string;
  orgSubjects: { id: string; name: string }[];
  enrolledIds: Set<string>;
  linkSubject: ReturnType<typeof useLinkStudentSubjectMutation>;
  createSubject: ReturnType<typeof useCreateSubjectMutation>;
  subjectsLoading: boolean;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [showNewSubject, setShowNewSubject] = useState(false);
  const form = useForm<LinkStudentSubjectForm>({
    resolver: zodResolver<LinkStudentSubjectForm>(linkStudentSubjectFormSchema),
    defaultValues: {
      subjectId: "",
      currentGrade: "",
      predictedGrade: "",
    },
  });

  const available = orgSubjects.filter((s) => !enrolledIds.has(s.id));

  async function onLink(values: LinkStudentSubjectForm) {
    setFormError(null);
    try {
      await linkSubject.mutateAsync({
        studentId,
        body: {
          subjectId: values.subjectId,
          ...(values.currentGrade ? { currentGrade: values.currentGrade } : {}),
          ...(values.predictedGrade
            ? { predictedGrade: values.predictedGrade }
            : {}),
        },
      });
      form.reset({
        subjectId: "",
        currentGrade: "",
        predictedGrade: "",
      });
    } catch (e) {
      if (isStudiqoApiError(e)) {
        setFormError(
          e.status === 409
            ? "That subject is already linked."
            : e.message,
        );
      } else setFormError("Could not link subject");
    }
  }

  return (
    <Card size="sm" className="bg-muted/30 ring-0">
      <CardHeader>
        <CardTitle className="text-sm">Link a subject</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {subjectsLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading subject list…
          </p>
        ) : null}
        <form
          onSubmit={form.handleSubmit(onLink)}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor={`link-subject-${studentId}`}>Subject</Label>
            <Controller
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={subjectsLoading}
                >
                  <SelectTrigger
                    id={`link-subject-${studentId}`}
                    className="w-full max-w-full"
                  >
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`link-current-${studentId}`}>
              Current grade (optional)
            </Label>
            <Input
              id={`link-current-${studentId}`}
              {...form.register("currentGrade")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`link-predicted-${studentId}`}>
              Predicted grade (optional)
            </Label>
            <Input
              id={`link-predicted-${studentId}`}
              {...form.register("predictedGrade")}
            />
          </div>
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            disabled={linkSubject.isPending || available.length === 0}
            className="w-fit"
          >
            {linkSubject.isPending ? "Linking…" : "Link subject"}
          </Button>
        </form>

        {available.length === 0 && !subjectsLoading ? (
          <p className="text-sm text-muted-foreground">
            All subjects are linked, or the list is empty.
          </p>
        ) : null}

        <Button
          type="button"
          variant="link"
          className="h-auto w-fit justify-start p-0"
          onClick={() => setShowNewSubject((v) => !v)}
        >
          {showNewSubject ? "Hide new subject" : "Create subject"}
        </Button>
        {showNewSubject ? (
          <CreateSubjectInline
            createSubject={createSubject}
            onCreated={() => setShowNewSubject(false)}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function CreateSubjectInline({
  createSubject,
  onCreated,
}: {
  createSubject: ReturnType<typeof useCreateSubjectMutation>;
  onCreated: () => void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const form = useForm<CreateSubjectForm>({
    resolver: zodResolver<CreateSubjectForm>(createSubjectFormSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: CreateSubjectForm) {
    setErr(null);
    try {
      await createSubject.mutateAsync({ name: values.name });
      form.reset({ name: "" });
      onCreated();
    } catch (e) {
      if (isStudiqoApiError(e)) setErr(e.message);
      else setErr("Could not create subject");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex max-w-xs flex-col gap-3"
    >
      <Input
        {...form.register("name")}
        placeholder="Subject name"
        aria-label="New subject name"
      />
      {err ? (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={createSubject.isPending}
        className="w-fit"
      >
        {createSubject.isPending ? "Creating…" : "Create"}
      </Button>
    </form>
  );
}

function EmergencyContactRow({
  contact,
  studentId,
  canManage,
  updateContact,
  deleteContact,
}: {
  contact: {
    id: string;
    name: string;
    phone: string;
    relationship: string;
  };
  studentId: string;
  canManage: boolean;
  updateContact: ReturnType<typeof useUpdateEmergencyContactMutation>;
  deleteContact: ReturnType<typeof useDeleteEmergencyContactMutation>;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      {!editing ? (
        <>
          <div className="text-foreground">
            <strong className="font-semibold">{contact.name}</strong> —{" "}
            {contact.relationship}
          </div>
          <div className="text-sm text-muted-foreground">{contact.phone}</div>
          {canManage ? (
            <div className="mt-2 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <DeleteContactButton
                onDelete={() =>
                  deleteContact.mutateAsync({
                    studentId,
                    contactId: contact.id,
                  })
                }
                disabled={deleteContact.isPending}
              />
            </div>
          ) : null}
        </>
      ) : (
        <EditEmergencyContactForm
          contact={contact}
          studentId={studentId}
          onCancel={() => setEditing(false)}
          updateContact={updateContact}
        />
      )}
    </div>
  );
}

function DeleteContactButton({
  onDelete,
  disabled,
}: {
  onDelete: () => Promise<void>;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (!open) {
    return (
      <Button
        type="button"
        variant="destructive"
        size="sm"
        className="h-auto px-0 text-sm"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
    );
  }
  return (
    <span className="inline-flex flex-col gap-2">
      {err ? (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <span className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setErr(null);
            void (async () => {
              try {
                await onDelete();
              } catch (e) {
                if (isStudiqoApiError(e)) setErr(e.message);
                else setErr("Could not delete");
              }
            })();
          }}
        >
          {disabled ? "…" : "Confirm"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </span>
    </span>
  );
}

function EditEmergencyContactForm({
  contact,
  studentId,
  onCancel,
  updateContact,
}: {
  contact: { id: string; name: string; phone: string; relationship: string };
  studentId: string;
  onCancel: () => void;
  updateContact: ReturnType<typeof useUpdateEmergencyContactMutation>;
}) {
  const [err, setErr] = useState<string | null>(null);
  const form = useForm<UpdateEmergencyContactForm>({
    resolver: zodResolver<UpdateEmergencyContactForm>(
      updateEmergencyContactFormSchema,
    ),
    defaultValues: {
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
    },
  });

  async function onSubmit(values: UpdateEmergencyContactForm) {
    setErr(null);
    const dirty = form.formState.dirtyFields;
    const body: Record<string, string> = {};
    if (dirty.name && values.name) body.name = values.name;
    if (dirty.phone && values.phone) body.phone = values.phone;
    if (dirty.relationship && values.relationship) {
      body.relationship = values.relationship;
    }
    if (Object.keys(body).length === 0) {
      setErr("Change at least one field");
      return;
    }
    try {
      await updateContact.mutateAsync({
        studentId,
        contactId: contact.id,
        body,
      });
      onCancel();
    } catch (e) {
      if (isStudiqoApiError(e)) setErr(e.message);
      else setErr("Could not update");
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-3"
    >
      <Input {...form.register("name")} aria-label="Contact name" />
      <Input {...form.register("phone")} aria-label="Phone" />
      <Input {...form.register("relationship")} aria-label="Relationship" />
      {err ? (
        <p className="text-xs text-destructive" role="alert">
          {err}
        </p>
      ) : null}
      <span className="flex flex-wrap gap-2">
        <Button type="submit" disabled={updateContact.isPending} size="sm">
          {updateContact.isPending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </span>
    </form>
  );
}

function AddEmergencyContactForm({
  studentId,
  createContact,
  contactCount,
}: {
  studentId: string;
  createContact: ReturnType<typeof useCreateEmergencyContactMutation>;
  contactCount: number;
}) {
  const [err, setErr] = useState<string | null>(null);
  const form = useForm<CreateEmergencyContactForm>({
    resolver: zodResolver<CreateEmergencyContactForm>(
      createEmergencyContactFormSchema,
    ),
    defaultValues: { name: "", phone: "", relationship: "" },
  });

  if (contactCount >= 2) {
    return (
      <p className="text-sm text-muted-foreground">
        Maximum of two emergency contacts reached.
      </p>
    );
  }

  async function onSubmit(values: CreateEmergencyContactForm) {
    setErr(null);
    try {
      await createContact.mutateAsync({ studentId, body: values });
      form.reset({ name: "", phone: "", relationship: "" });
    } catch (e) {
      if (isStudiqoApiError(e)) {
        setErr(
          e.status === 409
            ? "Maximum emergency contacts reached."
            : e.message,
        );
      } else setErr("Could not add contact");
    }
  }

  return (
    <Card size="sm" className="bg-muted/30 ring-0">
      <CardHeader>
        <CardTitle className="text-sm">Add emergency contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <Input {...form.register("name")} placeholder="Name" />
          <Input {...form.register("phone")} placeholder="Phone" />
          <Input
            {...form.register("relationship")}
            placeholder="Relationship"
          />
          {err ? (
            <p className="text-xs text-destructive" role="alert">
              {err}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={createContact.isPending}
            className="w-fit"
          >
            {createContact.isPending ? "Adding…" : "Add contact"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
