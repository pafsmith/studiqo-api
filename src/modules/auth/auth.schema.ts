import { z } from "zod";

export const registerSchema = z.object({
    body: z.object({
      email: z.string().trim().email("Valid email is required"),
      password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password is too long"),
    }),
  });

