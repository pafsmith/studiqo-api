import { z } from "zod";

export const createStudentSchema = z.object({
  body: z.object({
    parentId: z.string().uuid(),
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    dateOfBirth: z.coerce.date(),
  }),
});
