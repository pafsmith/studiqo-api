import request from "supertest";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { eq } from "drizzle-orm";
import { organizationMemberships, organizations, users } from "../../src/db/schema.js";
import type { OrganizationMembershipRole } from "../../src/db/schema.js";
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
  lessons: "/api/v1/lessons",
  lesson: (lessonId: string) => `/api/v1/lessons/${lessonId}`,
  lessonCancel: (lessonId: string) => `/api/v1/lessons/${lessonId}/cancel`,
  lessonComplete: (lessonId: string) => `/api/v1/lessons/${lessonId}/complete`,
  studentSubjects: (studentId: string) => `/api/v1/students/${studentId}/subjects`,
} as const;

/** Satisfies `registerSchema` (upper, lower, digit, special, length). */
export const validPassword = "TestReg1!";

export type RegisterResponseBody = {
  id: string;
  email: string;
  role?: OrganizationMembershipRole;
  isSuperadmin: boolean;
  activeOrganizationId?: string;
  createdAt: string;
};

export type LoginResponseBody = RegisterResponseBody & {
  token: string;
  refreshToken: string;
};

async function ensureDefaultOrganizationId(): Promise<string> {
  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.slug, "default-organization"))
    .limit(1);
  if (existing) {
    return existing.id;
  }
  const [created] = await db
    .insert(organizations)
    .values({
      name: "Default Organization",
      slug: "default-organization",
    })
    .returning();
  return created.id;
}

type RegisterHelperOptions = {
  bootstrapAdminOrganization?: boolean;
};

export async function registerUser(
  email: string,
  options?: RegisterHelperOptions,
): Promise<RegisterResponseBody> {
  const bootstrapAdminOrganization = options?.bootstrapAdminOrganization ?? true;
  const res = await request(app)
    .post(paths.register)
    .send({ email, password: validPassword })
    .expect(201);

  if (bootstrapAdminOrganization) {
    const organizationId = await ensureDefaultOrganizationId();
    await db
      .insert(organizationMemberships)
      .values({
        organizationId,
        userId: res.body.id,
        role: "org_admin",
      })
      .onConflictDoUpdate({
        target: [
          organizationMemberships.organizationId,
          organizationMemberships.userId,
        ],
        set: { role: "org_admin" },
      });
  }

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
  role: Exclude<OrganizationMembershipRole, "org_admin">,
  organizationId?: string,
): Promise<{ id: string; email: string }> {
  const hash = await authService.hashPassword(validPassword);
  const [row] = await db
    .insert(users)
    .values({
      email,
      hasedPassword: hash,
    })
    .returning();
  const resolvedOrganizationId =
    organizationId ?? (await ensureDefaultOrganizationId());
  await db.insert(organizationMemberships).values({
    organizationId: resolvedOrganizationId,
    userId: row.id,
    role,
  });
  return { id: row.id, email: row.email };
}
