import { z } from "zod";

const organizationMembershipRoleSchema = z.enum(["org_admin", "tutor", "parent"]);

const updateUserBodySchema = z
  .object({
    email: z.string().min(1).max(255).email().optional(),
    role: organizationMembershipRoleSchema.optional(),
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

export const deleteUserSchema = z.object({
  params: z.object({
    userId: z.string().uuid(),
  }),
});
