import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Valid email is required")
      .min(1, "Email is required"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password is too long")
      .min(1, "Password is required")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must include a special character"),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .email("Valid email is required")
      .min(1, "Email is required"),
    password: z.string().min(1, "Password is required"),
  }),
});
