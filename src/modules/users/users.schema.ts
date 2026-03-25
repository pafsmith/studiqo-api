import { z } from "zod";

const userRoleSchema = z.enum(["tutor", "parent", "admin"]);

const updateUserBodySchema = z
  .object({
    email: z.string().min(1).max(255).email().optional(),
    role: userRoleSchema.optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  });

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
  body: updateUserBodySchema,
});
