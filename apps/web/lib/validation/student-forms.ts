import { z } from "zod";

const uuid = z.string().uuid();

/** OpenAPI: min 1, max 255 */
const nameField = z.string().trim().min(1).max(255);

/** E.164-style per OpenAPI emergency contact schemas */
const phoneField = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{1,14}$/, "Use E.164-style phone (e.g. +441234567890)");

const dateOfBirthInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((s) => `${s}T12:00:00.000Z`);

export const createStudentFormSchema = z.object({
  parentId: uuid,
  tutorId: z.union([uuid, z.literal("")]).optional(),
  firstName: nameField,
  lastName: nameField,
  dateOfBirth: dateOfBirthInput,
});

export type CreateStudentForm = z.infer<typeof createStudentFormSchema>;

export const updateStudentFormSchema = z
  .object({
    parentId: uuid.optional(),
    tutorId: z.union([uuid, z.literal("")]).optional(),
    firstName: nameField.optional(),
    lastName: nameField.optional(),
    dateOfBirth: z
      .string()
      .trim()
      .optional()
      .refine(
        (s) => s === undefined || s === "" || /^\d{4}-\d{2}-\d{2}$/.test(s),
        "Use YYYY-MM-DD",
      ),
  })
  .refine(
    (data) =>
      data.parentId !== undefined ||
      data.tutorId !== undefined ||
      data.firstName !== undefined ||
      data.lastName !== undefined ||
      (data.dateOfBirth !== undefined && data.dateOfBirth !== ""),
    { message: "Change at least one field" },
  );

export type UpdateStudentForm = z.infer<typeof updateStudentFormSchema>;

export const linkStudentSubjectFormSchema = z.object({
  subjectId: z
    .string()
    .min(1, "Select a subject")
    .pipe(z.string().uuid()),
  currentGrade: z.string().max(32).optional(),
  predictedGrade: z.string().max(32).optional(),
});

export type LinkStudentSubjectForm = z.infer<
  typeof linkStudentSubjectFormSchema
>;

export const createEmergencyContactFormSchema = z.object({
  name: nameField,
  phone: phoneField,
  relationship: z.string().trim().min(1).max(63),
});

export type CreateEmergencyContactForm = z.infer<
  typeof createEmergencyContactFormSchema
>;

export const updateEmergencyContactFormSchema = z
  .object({
    name: nameField.optional(),
    phone: phoneField.optional(),
    relationship: z.string().trim().min(1).max(63).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.phone !== undefined ||
      data.relationship !== undefined,
    { message: "Change at least one field" },
  );

export type UpdateEmergencyContactForm = z.infer<
  typeof updateEmergencyContactFormSchema
>;

export const createSubjectFormSchema = z.object({
  name: nameField,
});

export type CreateSubjectForm = z.infer<typeof createSubjectFormSchema>;
