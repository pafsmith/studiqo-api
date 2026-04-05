"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { isStudiqoApiError } from "@studiqo/api-client/errors";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

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
      <main>
        <p>
          <Link href={listUrl}>← Students</Link>
        </p>
        <p>Loading…</p>
      </main>
    );
  }

  if (studentQ.isLoading) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Students</Link>
        </p>
        <p>Loading student…</p>
      </main>
    );
  }

  if (studentQ.error || !studentQ.data) {
    return (
      <main>
        <p>
          <Link href={listUrl}>← Students</Link>
        </p>
        <h1 style={{ fontSize: 22 }}>Student</h1>
        <p style={{ color: "#b91c1c" }}>
          {studentQ.error instanceof Error
            ? studentQ.error.message
            : "Student not found or access denied."}
        </p>
      </main>
    );
  }

  const student = studentQ.data;

  return (
    <main>
      <p style={{ marginBottom: 8 }}>
        <Link href={listUrl}>← Students</Link>
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 22, margin: 0 }}>
          {student.firstName} {student.lastName}
        </h1>
        {canManage ? (
          <span style={{ display: "flex", gap: 12, fontSize: 14 }}>
            <Link href={`${base}/${studentId}/edit`}>Edit</Link>
            <DeleteStudentButton
              listUrl={listUrl}
              onDelete={() => deleteStudent.mutateAsync(studentId)}
              disabled={deleteStudent.isPending}
            />
          </span>
        ) : null}
      </div>

      <p style={{ fontSize: 15, opacity: 0.85 }}>
        Born {formatIsoDate(student.dateOfBirth)}
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18 }}>Subjects</h2>
        {subjectsQ.isLoading ? <p>Loading subjects…</p> : null}
        {subjectsQ.error ? (
          <p style={{ color: "#b91c1c" }}>
            {subjectsQ.error instanceof Error
              ? subjectsQ.error.message
              : "Could not load subjects"}
          </p>
        ) : null}
        {subjectsQ.data && subjectsQ.data.length === 0 ? (
          <p style={{ opacity: 0.85 }}>No subjects linked yet.</p>
        ) : null}
        {subjectsQ.data && subjectsQ.data.length > 0 ? (
          <ul style={{ paddingLeft: 20 }}>
            {subjectsQ.data.map((row) => (
              <li key={row.subjectId} style={{ marginBottom: 8 }}>
                <strong>{row.subjectName}</strong>
                {row.currentGrade != null || row.predictedGrade != null ? (
                  <span style={{ opacity: 0.85 }}>
                    {" "}
                    — current: {row.currentGrade ?? "—"}, predicted:{" "}
                    {row.predictedGrade ?? "—"}
                  </span>
                ) : null}
                <div style={{ fontSize: 13, opacity: 0.65 }}>
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
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18 }}>Emergency contacts</h2>
        {contactsQ.isLoading ? <p>Loading contacts…</p> : null}
        {contactsQ.error ? (
          <p style={{ color: "#b91c1c" }}>
            {contactsQ.error instanceof Error
              ? contactsQ.error.message
              : "Could not load contacts"}
          </p>
        ) : null}
        {contactsQ.data && contactsQ.data.length === 0 ? (
          <p style={{ opacity: 0.85 }}>No emergency contacts on file.</p>
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
      </section>
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
      <button
        type="button"
        style={{ fontSize: 14, color: "#b91c1c" }}
        onClick={() => setConfirmOpen(true)}
      >
        Delete
      </button>
    );
  }

  return (
    <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 13 }}>Delete this student?</span>
      {err ? <span style={{ color: "#b91c1c", fontSize: 13 }}>{err}</span> : null}
      <span style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          disabled={disabled}
          style={{ fontSize: 14 }}
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
        </button>
        <button
          type="button"
          style={{ fontSize: 14 }}
          onClick={() => {
            setConfirmOpen(false);
            setErr(null);
          }}
        >
          Cancel
        </button>
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
    resolver: zodResolver(linkStudentSubjectFormSchema),
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
    <div
      style={{
        marginTop: 16,
        padding: 16,
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        maxWidth: 420,
      }}
    >
      <h3 style={{ fontSize: 16, marginTop: 0 }}>Link a subject</h3>
      {subjectsLoading ? <p style={{ fontSize: 14 }}>Loading subject list…</p> : null}
      <form
        onSubmit={form.handleSubmit(onLink)}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Subject</span>
          <select
            {...form.register("subjectId")}
            style={{ padding: 8, fontSize: 15 }}
          >
            <option value="">Select…</option>
            {available.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Current grade (optional)</span>
          <input {...form.register("currentGrade")} style={{ padding: 8 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span>Predicted grade (optional)</span>
          <input {...form.register("predictedGrade")} style={{ padding: 8 }} />
        </label>
        {formError ? (
          <p style={{ color: "#b91c1c", margin: 0, fontSize: 14 }}>{formError}</p>
        ) : null}
        <button
          type="submit"
          disabled={linkSubject.isPending || available.length === 0}
          style={{ padding: "8px 12px", alignSelf: "flex-start" }}
        >
          {linkSubject.isPending ? "Linking…" : "Link subject"}
        </button>
      </form>

      {available.length === 0 && !subjectsLoading ? (
        <p style={{ fontSize: 14, opacity: 0.85, marginTop: 12 }}>
          All subjects are linked, or the list is empty.
        </p>
      ) : null}

      <button
        type="button"
        style={{ marginTop: 12, fontSize: 14 }}
        onClick={() => setShowNewSubject((v) => !v)}
      >
        {showNewSubject ? "Hide new subject" : "Create subject"}
      </button>
      {showNewSubject ? (
        <CreateSubjectInline
          createSubject={createSubject}
          onCreated={() => setShowNewSubject(false)}
        />
      ) : null}
    </div>
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
    resolver: zodResolver(createSubjectFormSchema),
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
      style={{
        marginTop: 12,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxWidth: 320,
      }}
    >
      <input
        {...form.register("name")}
        placeholder="Subject name"
        style={{ padding: 8, fontSize: 15 }}
      />
      {err ? <span style={{ color: "#b91c1c", fontSize: 13 }}>{err}</span> : null}
      <button
        type="submit"
        disabled={createSubject.isPending}
        style={{ padding: "8px 12px", alignSelf: "flex-start" }}
      >
        {createSubject.isPending ? "Creating…" : "Create"}
      </button>
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
    <div
      style={{
        marginTop: 12,
        padding: 12,
        border: "1px solid #eee",
        borderRadius: 6,
        maxWidth: 440,
      }}
    >
      {!editing ? (
        <>
          <div>
            <strong>{contact.name}</strong> — {contact.relationship}
          </div>
          <div style={{ fontSize: 14, opacity: 0.85 }}>{contact.phone}</div>
          {canManage ? (
            <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 14 }}>
              <button type="button" onClick={() => setEditing(true)}>
                Edit
              </button>
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
      <button type="button" onClick={() => setOpen(true)}>
        Delete
      </button>
    );
  }
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      {err ? <span style={{ color: "#b91c1c" }}>{err}</span> : null}
      <span style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
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
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
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
    resolver: zodResolver(updateEmergencyContactFormSchema),
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
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      <input {...form.register("name")} style={{ padding: 8 }} />
      <input {...form.register("phone")} style={{ padding: 8 }} />
      <input {...form.register("relationship")} style={{ padding: 8 }} />
      {err ? <span style={{ color: "#b91c1c", fontSize: 13 }}>{err}</span> : null}
      <span style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={updateContact.isPending}>
          {updateContact.isPending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
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
    resolver: zodResolver(createEmergencyContactFormSchema),
    defaultValues: { name: "", phone: "", relationship: "" },
  });

  if (contactCount >= 2) {
    return (
      <p style={{ fontSize: 14, opacity: 0.85, marginTop: 16 }}>
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
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      style={{
        marginTop: 20,
        padding: 16,
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        maxWidth: 420,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <h3 style={{ fontSize: 16, margin: 0 }}>Add emergency contact</h3>
      <input {...form.register("name")} placeholder="Name" style={{ padding: 8 }} />
      <input {...form.register("phone")} placeholder="Phone" style={{ padding: 8 }} />
      <input
        {...form.register("relationship")}
        placeholder="Relationship"
        style={{ padding: 8 }}
      />
      {err ? <span style={{ color: "#b91c1c", fontSize: 13 }}>{err}</span> : null}
      <button type="submit" disabled={createContact.isPending}>
        {createContact.isPending ? "Adding…" : "Add contact"}
      </button>
    </form>
  );
}
