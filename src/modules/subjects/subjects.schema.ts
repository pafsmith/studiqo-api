import z from "zod";

export const createSubjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
  }),
}); 
