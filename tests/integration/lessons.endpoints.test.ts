import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { students, subjects, users } from "../../src/db/schema.js";
import { insertUserWithRole, loginUser, paths, registerUser } from "./helpers.js";

describe("POST /api/v1/lessons", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `lessons-admin-${runId}@example.com`;
  const parentEmail = `lessons-parent-${runId}@example.com`;
  const tutorEmail = `lessons-tutor-${runId}@example.com`;
  let adminId: string | null = null;
  let parentId: string | null = null;
  let tutorId: string | null = null;
  let studentId: string | null = null;
  let subjectId: string | null = null;

  afterEach(async () => {
    if (studentId) {
      await db.delete(students).where(eq(students.id, studentId));
      studentId = null;
    }
    if (subjectId) {
      await db.delete(subjects).where(eq(subjects.id, subjectId));
      subjectId = null;
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

  async function seedStudentSubjectAndSession() {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const studentRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        tutorId: tutor.id,
        firstName: "Alex",
        lastName: "Learner",
        dateOfBirth: "2012-03-15T12:00:00.000Z",
      })
      .expect(201);
    const sid = studentRes.body.id as string;
    studentId = sid;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `LessonSubject-${runId}` })
      .expect(201);
    const subjId = subRes.body.id as string;
    subjectId = subjId;

    await request(app)
      .post(paths.studentSubjects(sid))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ subjectId: subjId })
      .expect(201);

    return { adminSession, tutorId: tutor.id, studentId: sid, subjectId: subjId };
  }

  function validLessonPayload(tutor: string, student: string, subject: string) {
    return {
      studentId: student,
      tutorId: tutor,
      subjectId: subject,
      startsAt: "2026-04-01T14:00:00.000Z",
      endsAt: "2026-04-01T15:00:00.000Z",
    };
  }

  it("returns 401 without auth", async () => {
    await request(app)
      .post(paths.lessons)
      .send(
        validLessonPayload(
          "00000000-0000-4000-8000-000000000001",
          "00000000-0000-4000-8000-000000000002",
          "00000000-0000-4000-8000-000000000003",
        ),
      )
      .expect(401);
  });

  it("returns 403 for non-admin", async () => {
    const {
      adminSession,
      tutorId: tid,
      studentId: sid,
      subjectId: subjId,
    } = await seedStudentSubjectAndSession();
    const parentSession = await loginUser(parentEmail);

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .send(validLessonPayload(tid, sid, subjId))
      .expect(403);

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tid, sid, subjId))
      .expect(201);
  });

  it("returns 400 when endsAt is not after startsAt", async () => {
    const {
      adminSession,
      tutorId: tid,
      studentId: sid,
      subjectId: subjId,
    } = await seedStudentSubjectAndSession();

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        studentId: sid,
        tutorId: tid,
        subjectId: subjId,
        startsAt: "2026-04-01T15:00:00.000Z",
        endsAt: "2026-04-01T14:00:00.000Z",
      })
      .expect(400);
  });

  it("returns 404 when student or subject is missing", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `OrphanSubject-${runId}` })
      .expect(201);
    const orphanSubjId = subRes.body.id as string;
    subjectId = orphanSubjId;

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(
        validLessonPayload(
          tutor.id,
          "00000000-0000-4000-8000-000000000099",
          orphanSubjId,
        ),
      )
      .expect(404);

    const studentRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        tutorId: tutor.id,
        firstName: "Sam",
        lastName: "Student",
        dateOfBirth: "2011-01-01T12:00:00.000Z",
      })
      .expect(201);
    const samStudentId = studentRes.body.id as string;
    studentId = samStudentId;

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(
        validLessonPayload(
          tutor.id,
          samStudentId,
          "00000000-0000-4000-8000-000000000088",
        ),
      )
      .expect(404);
  });

  it("returns 400 when student has no tutor or tutor mismatch or not enrolled", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const parent = await insertUserWithRole(parentEmail, "parent");
    parentId = parent.id;

    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `NoTutorSub-${runId}` })
      .expect(201);
    const noTutorSubjId = subRes.body.id as string;
    subjectId = noTutorSubjId;

    const noTutorStudent = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        firstName: "No",
        lastName: "Tutor",
        dateOfBirth: "2010-05-05T12:00:00.000Z",
      })
      .expect(201);
    const noTutorStudentId = noTutorStudent.body.id as string;

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tutor.id, noTutorStudentId, noTutorSubjId))
      .expect(400);

    await db.delete(students).where(eq(students.id, noTutorStudentId));

    const studentRes = await request(app)
      .post(paths.students)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        parentId: parent.id,
        tutorId: tutor.id,
        firstName: "Enrolled",
        lastName: "Check",
        dateOfBirth: "2009-09-09T12:00:00.000Z",
      })
      .expect(201);
    const enrolledStudentId = studentRes.body.id as string;
    studentId = enrolledStudentId;

    const otherTutor = await insertUserWithRole(
      `other-tutor-${runId}@example.com`,
      "tutor",
    );
    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(otherTutor.id, enrolledStudentId, noTutorSubjId))
      .expect(400);

    await db.delete(users).where(eq(users.id, otherTutor.id));

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tutor.id, enrolledStudentId, noTutorSubjId))
      .expect(400);

    await request(app)
      .post(paths.studentSubjects(enrolledStudentId))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ subjectId: noTutorSubjId })
      .expect(201);

    const ok = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tutor.id, enrolledStudentId, noTutorSubjId))
      .expect(201);

    expect(ok.body.status).toBe("scheduled");
    expect(ok.body.studentId).toBe(enrolledStudentId);
    expect(ok.body.tutorId).toBe(tutor.id);
    expect(ok.body.subjectId).toBe(noTutorSubjId);
  });

  it("creates a lesson when admin and data is valid", async () => {
    const {
      adminSession,
      tutorId: tid,
      studentId: sid,
      subjectId: subjId,
    } = await seedStudentSubjectAndSession();

    const res = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tid, sid, subjId))
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.notes).toBeNull();
    expect(res.body.startsAt).toBeDefined();
    expect(res.body.endsAt).toBeDefined();
  });
});
