import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { students, users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, paths, registerUser } from "./helpers.js";

const emergencyContactsPath = (studentId: string) =>
  `/api/v1/students/${studentId}/emergency-contacts`;
const emergencyContactByIdPath = (studentId: string, contactId: string) =>
  `/api/v1/students/${studentId}/emergency-contacts/${contactId}`;

describe("Emergency Contacts API", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `ec-admin-${runId}@example.com`;
  const parentEmail = `ec-parent-${runId}@example.com`;
  const tutorEmail = `ec-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;
  let tutorId: string | null = null;
  let studentId: string | null = null;

  afterEach(async () => {
    if (studentId) {
      await db.delete(students).where(eq(students.id, studentId));
      studentId = null;
    }
    if (tutorId) {
      await db.delete(users).where(eq(users.id, tutorId));
      tutorId = null;
    }
    if (parentId) {
      await db.delete(users).where(eq(users.id, parentId));
      parentId = null;
    }
    if (adminId) {
      await db.delete(users).where(eq(users.id, adminId));
      adminId = null;
    }
  });

  describe("GET /api/v1/students/:studentId/emergency-contacts", () => {
    it("returns 401 without auth, 404 for non-existent student", async () => {
      await request(app)
        .get(emergencyContactsPath("00000000-0000-4000-8000-000000000001"))
        .expect(401);

      const admin = await registerUser(adminEmail);
      adminId = admin.id;
      const session = await loginUser(adminEmail);

      await request(app)
        .get(emergencyContactsPath("00000000-0000-4000-8000-000000000088"))
        .set("Authorization", `Bearer ${session.token}`)
        .expect(404);
    });

    it("allows admin/parent/tutor to view contacts, blocks others", async () => {
      const admin = await registerUser(adminEmail);
      adminId = admin.id;
      const adminSession = await loginUser(adminEmail);

      const parent = await insertUserWithRole(parentEmail, "parent");
      parentId = parent.id;

      const tutor = await insertUserWithRole(tutorEmail, "tutor");
      tutorId = tutor.id;

      const res = await request(app)
        .post(paths.students)
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({
          parentId: parent.id,
          tutorId: tutor.id,
          firstName: "Jane",
          lastName: "Student",
          dateOfBirth: "2014-06-07T08:00:00.000Z",
        })
        .expect(201);
      studentId = res.body.id;

      await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John Doe", phone: "+1234567890", relationship: "father" })
        .expect(201);

      const otherParent = await insertUserWithRole(`other-${runId}@example.com`, "parent");
      const otherParentSession = await loginUser(`other-${runId}@example.com`);

      await request(app)
        .get(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${otherParentSession.token}`)
        .expect(403);

      const adminRes = await request(app)
        .get(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .expect(200);
      expect(adminRes.body).toHaveLength(1);

      const parentSession = await loginUser(parentEmail);
      const parentRes = await request(app)
        .get(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${parentSession.token}`)
        .expect(200);
      expect(parentRes.body).toHaveLength(1);

      const tutorSession = await loginUser(tutorEmail);
      const tutorRes = await request(app)
        .get(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${tutorSession.token}`)
        .expect(200);
      expect(tutorRes.body).toHaveLength(1);

      await db.delete(users).where(eq(users.id, otherParent.id));
    });
  });

  describe("POST /api/v1/students/:studentId/emergency-contacts", () => {
    it("requires admin, validates input, enforces max 2 contacts", async () => {
      const admin = await registerUser(adminEmail);
      adminId = admin.id;
      const adminSession = await loginUser(adminEmail);

      const parent = await insertUserWithRole(parentEmail, "parent");
      parentId = parent.id;

      const parentSession = await loginUser(parentEmail);

      await request(app)
        .post(emergencyContactsPath("00000000-0000-4000-8000-000000000001"))
        .set("Authorization", `Bearer ${parentSession.token}`)
        .send({ name: "Test", phone: "+1234567890", relationship: "father" })
        .expect(403);

      const res = await request(app)
        .post(paths.students)
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({
          parentId: parent.id,
          firstName: "Jane",
          lastName: "Student",
          dateOfBirth: "2014-06-07T08:00:00.000Z",
        })
        .expect(201);
      studentId = res.body.id;

      await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John", phone: "invalid", relationship: "father" })
        .expect(400);

      const contact1 = await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John Doe", phone: "+1111111111", relationship: "father" })
        .expect(201);
      expect(contact1.body.name).toBe("John Doe");

      await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "Jane Doe", phone: "+2222222222", relationship: "mother" })
        .expect(201);

      const maxRes = await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "Extra", phone: "+3333333333", relationship: "guardian" })
        .expect(409);
      expect(maxRes.body.error).toMatch(/maximum of 2/i);
    });
  });

  describe("PUT /api/v1/students/:studentId/emergency-contacts/:contactId", () => {
    it("requires admin, validates input, updates contact by id", async () => {
      const admin = await registerUser(adminEmail);
      adminId = admin.id;
      const adminSession = await loginUser(adminEmail);

      const parent = await insertUserWithRole(parentEmail, "parent");
      parentId = parent.id;

      await request(app)
        .put(
          emergencyContactByIdPath(
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000099",
          ),
        )
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({})
        .expect(400);

      const studentRes = await request(app)
        .post(paths.students)
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({
          parentId: parent.id,
          firstName: "Jane",
          lastName: "Student",
          dateOfBirth: "2014-06-07T08:00:00.000Z",
        })
        .expect(201);
      studentId = studentRes.body.id;

      const createRes = await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John Doe", phone: "+1234567890", relationship: "father" })
        .expect(201);
      const contactId = createRes.body.id as string;

      const parentSession = await loginUser(parentEmail);
      await request(app)
        .put(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${parentSession.token}`)
        .send({ name: "Updated" })
        .expect(403);

      await request(app)
        .put(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ phone: "invalid" })
        .expect(400);

      const updateRes = await request(app)
        .put(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John Smith", phone: "+9999999999" })
        .expect(200);
      expect(updateRes.body.name).toBe("John Smith");
      expect(updateRes.body.phone).toBe("+9999999999");

      await request(app)
        .put(
          emergencyContactByIdPath(studentId!, "123e4567-e89b-12d3-a456-426614174000"),
        )
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "Test" })
        .expect(404);
    });
  });

  describe("DELETE /api/v1/students/:studentId/emergency-contacts/:contactId", () => {
    it("requires admin, deletes contact by id", async () => {
      const admin = await registerUser(adminEmail);
      adminId = admin.id;
      const adminSession = await loginUser(adminEmail);

      const parent = await insertUserWithRole(parentEmail, "parent");
      parentId = parent.id;

      const studentRes = await request(app)
        .post(paths.students)
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({
          parentId: parent.id,
          firstName: "Jane",
          lastName: "Student",
          dateOfBirth: "2014-06-07T08:00:00.000Z",
        })
        .expect(201);
      studentId = studentRes.body.id;

      const createRes = await request(app)
        .post(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .send({ name: "John Doe", phone: "+1234567890", relationship: "father" })
        .expect(201);
      const contactId = createRes.body.id as string;

      const parentSession = await loginUser(parentEmail);
      await request(app)
        .delete(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${parentSession.token}`)
        .expect(403);

      await request(app)
        .delete(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .expect(204);

      const listRes = await request(app)
        .get(emergencyContactsPath(studentId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .expect(200);
      expect(listRes.body).toEqual([]);

      await request(app)
        .delete(emergencyContactByIdPath(studentId!, contactId))
        .set("Authorization", `Bearer ${adminSession.token}`)
        .expect(404);
    });
  });
});