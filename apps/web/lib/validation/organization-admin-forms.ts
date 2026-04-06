import { z } from "zod";

export const organizationMembershipRoleSchema = z.enum([
  "org_admin",
  "tutor",
  "parent",
]);

export const addOrganizationMemberFormSchema = z.object({
  userId: z.string().trim().uuid("Enter a valid user ID (UUID)"),
  role: organizationMembershipRoleSchema,
});

export type AddOrganizationMemberForm = z.infer<
  typeof addOrganizationMemberFormSchema
>;
