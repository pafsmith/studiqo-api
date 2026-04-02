import { z } from "zod";

const invitationTokenSchema = z
  .string()
  .trim()
  .length(64)
  .regex(/^[a-f0-9]+$/, "Invalid invitation token format");

const invitationPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long")
  .min(1, "Password is required")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include a special character");

export const invitationTokenParamsSchema = z.object({
  params: z
    .object({
      token: invitationTokenSchema,
    })
    .strict(),
});

export const acceptInvitationSchema = z.object({
  params: z
    .object({
      token: invitationTokenSchema,
    })
    .strict(),
  body: z
    .object({
      password: invitationPasswordSchema,
    })
    .strict(),
});
