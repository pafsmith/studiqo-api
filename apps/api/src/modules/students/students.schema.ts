import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    parentId: z.string().uuid(),
    tutorId: z.string().uuid().optional(),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    dateOfBirth: z.coerce.date(),
  }),
});

const updateStudentBodySchema = z
  .object({
    parentId: z.string().uuid().optional(),
    tutorId: z.string().uuid().optional(),
    firstName: z.string().min(1).max(255).optional(),
    lastName: z.string().min(1).max(255).optional(),
    dateOfBirth: z.coerce.date().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const updateStudentSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
  body: updateStudentBodySchema,
});

export const deleteStudentSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
});

export const linkStudentSubjectSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
  body: z.object({
    subjectId: z.string().uuid(),
    currentGrade: z.string().max(32).optional(),
    predictedGrade: z.string().max(32).optional(),
  }),
});

export const getStudentSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
});

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const createEmergencyContactSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
  body: z.object({
    name: z.string().min(1).max(255),
    phone: z.string().regex(phoneRegex, "Invalid phone number format"),
    relationship: z.string().min(1).max(63),
  }),
});

const updateEmergencyContactBodySchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    phone: z.string().regex(phoneRegex, "Invalid phone number format").optional(),
    relationship: z.string().min(1).max(63).optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const getEmergencyContactsSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
  }),
});

export const updateEmergencyContactSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
    contactId: z.string().uuid(),
  }),
  body: updateEmergencyContactBodySchema,
});

export const deleteEmergencyContactSchema = z.object({
  params: z.object({
    studentId: z.string().uuid(),
    contactId: z.string().uuid(),
  }),
});
