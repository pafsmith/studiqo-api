import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include a special character");

export const loginFormSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerFormSchema = z.object({
  email: z.string().trim().email("Valid email is required"),
  password: passwordSchema,
});

export const createOrganizationFormSchema = z.object({
  name: z.string().trim().min(1).max(256),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(256)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use lowercase letters, numbers, and single hyphens between segments",
    ),
});

export const acceptInviteFormSchema = z.object({
  password: passwordSchema,
});

export const inviteTokenParamSchema = z
  .string()
  .length(64)
  .regex(/^[a-f0-9]+$/, "Invalid invitation token");

export const inviteParentEmailSchema = z.object({
  email: z.string().trim().email("Valid email is required").max(256),
});
