import { z } from "zod";

const membershipRoleSchema = z.enum(["org_admin", "tutor", "parent"]);

export const createOrganizationSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(256),
      slug: z
        .string()
        .trim()
        .min(3)
        .max(256)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    })
    .strict(),
});

export const addOrganizationMemberSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid(),
  }),
  body: z
    .object({
      userId: z.string().uuid(),
      role: membershipRoleSchema,
    })
    .strict(),
});

export const listOrganizationMembersSchema = z.object({
  params: z.object({
    organizationId: z.string().uuid(),
  }),
});
