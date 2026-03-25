import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    parentId: z.string().uuid(),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    dateOfBirth: z.coerce.date(),
  }),
});

const updateStudentBodySchema = z
  .object({
    parentId: z.string().uuid().optional(),
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
