import request from "supertest";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { users } from "../../src/db/schema.js";
import type { UserRole } from "../../src/db/schema.js";
import { authService } from "../../src/modules/auth/auth.service.js";

export const paths = {
  health: "/api/v1/health",
  register: "/api/v1/auth/register",
  login: "/api/v1/auth/login",
  logout: "/api/v1/auth/logout",
  me: "/api/v1/auth/me",
  refresh: "/api/v1/auth/refresh",
  students: "/api/v1/students",
  users: "/api/v1/users",
  subjects: "/api/v1/subjects",
} as const;

/** Satisfies `registerSchema` (upper, lower, digit, special, length). */
export const validPassword = "TestReg1!";

export type RegisterResponseBody = {
  id: string;
  email: string;
  role: "tutor" | "parent" | "student" | "admin";
  createdAt: string;
};

export type LoginResponseBody = RegisterResponseBody & {
  token: string;
  refreshToken: string;
};

export async function registerUser(email: string): Promise<RegisterResponseBody> {
  const res = await request(app)
    .post(paths.register)
    .send({ email, password: validPassword })
    .expect(201);
  return res.body;
}

export async function loginUser(email: string): Promise<LoginResponseBody> {
  const res = await request(app)
    .post(paths.login)
    .send({ email, password: validPassword })
    .expect(200);
  return res.body;
}

/** Inserts a user with the given role (for roles that public registration does not create). */
export async function insertUserWithRole(
  email: string,
  role: Exclude<UserRole, "admin">,
): Promise<{ id: string; email: string }> {
  const hash = await authService.hashPassword(validPassword);
  const [row] = await db
    .insert(users)
    .values({
      email,
      hasedPassword: hash,
      role,
    })
    .returning();
  return { id: row.id, email: row.email };
}
