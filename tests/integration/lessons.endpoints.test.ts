import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../../src/app.js";
import { db } from "../../src/db/index.js";
import { lessons, students, subjects, users } from "../../src/db/schema.js";
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

  it("returns 403 for non-admin; admin creates lesson with expected shape", async () => {
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

    const res = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(tid, sid, subjId))
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("scheduled");
    expect(res.body.notes).toBeNull();
    expect(res.body.startsAt).toBeDefined();
    expect(res.body.endsAt).toBeDefined();
  });

  it("returns 404 for unknown student", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const adminSession = await loginUser(adminEmail);

    const tutor = await insertUserWithRole(tutorEmail, "tutor");
    tutorId = tutor.id;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `OrphanSubject-${runId}` })
      .expect(201);
    const subjId = subRes.body.id as string;
    subjectId = subjId;

    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(
        validLessonPayload(
          tutor.id,
          "00000000-0000-4000-8000-000000000099",
          subjId,
        ),
      )
      .expect(404);
  });

  it("returns 400 when lesson tutor does not match student's assigned tutor", async () => {
    const {
      adminSession,
      tutorId: tid,
      studentId: sid,
      subjectId: subjId,
    } = await seedStudentSubjectAndSession();

    const otherTutor = await insertUserWithRole(
      `other-tutor-${runId}@example.com`,
      "tutor",
    );
    await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send(validLessonPayload(otherTutor.id, sid, subjId))
      .expect(400);

    await db.delete(users).where(eq(users.id, otherTutor.id));
  });
});

const rangeDay = {
  from: "2026-04-01T00:00:00.000Z",
  to: "2026-04-02T00:00:00.000Z",
};

describe("GET /api/v1/lessons", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `lessons-list-admin-${runId}@example.com`;
  const parentEmail = `lessons-list-parent-${runId}@example.com`;
  const tutorEmail = `lessons-list-tutor-${runId}@example.com`;
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

  async function seedWithLesson() {
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
        firstName: "List",
        lastName: "Pupil",
        dateOfBirth: "2012-03-15T12:00:00.000Z",
      })
      .expect(201);
    const sid = studentRes.body.id as string;
    studentId = sid;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `ListSubject-${runId}` })
      .expect(201);
    const subjId = subRes.body.id as string;
    subjectId = subjId;

    await request(app)
      .post(paths.studentSubjects(sid))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ subjectId: subjId })
      .expect(201);

    const lessonRes = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        studentId: sid,
        tutorId: tutor.id,
        subjectId: subjId,
        startsAt: "2026-04-01T14:00:00.000Z",
        endsAt: "2026-04-01T15:00:00.000Z",
      })
      .expect(201);

    return {
      adminSession,
      parentSession: await loginUser(parentEmail),
      tutorSession: await loginUser(tutorEmail),
      lessonId: lessonRes.body.id as string,
      sid,
      tutorUserId: tutor.id,
    };
  }

  it("returns 400 when to is not after from", async () => {
    const admin = await registerUser(adminEmail);
    adminId = admin.id;
    const session = await loginUser(adminEmail);

    await request(app)
      .get(paths.lessons)
      .set("Authorization", `Bearer ${session.token}`)
      .query({ from: rangeDay.to, to: rangeDay.from })
      .expect(400);
  });

  it("scopes list by role and rejects cross-tenant student filter", async () => {
    const { adminSession, parentSession, tutorSession, lessonId, sid } =
      await seedWithLesson();

    const adminList = await request(app)
      .get(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .query({ from: rangeDay.from, to: rangeDay.to })
      .expect(200);
    expect(adminList.body.some((l: { id: string }) => l.id === lessonId)).toBe(true);

    const parentList = await request(app)
      .get(paths.lessons)
      .set("Authorization", `Bearer ${parentSession.token}`)
      .query({ from: rangeDay.from, to: rangeDay.to })
      .expect(200);
    expect(parentList.body).toHaveLength(1);
    expect(parentList.body[0].id).toBe(lessonId);

    const tutorList = await request(app)
      .get(paths.lessons)
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .query({ from: rangeDay.from, to: rangeDay.to })
      .expect(200);
    expect(tutorList.body.some((l: { id: string }) => l.id === lessonId)).toBe(true);

    const otherParent = await insertUserWithRole(
      `other-list-${runId}@example.com`,
      "parent",
    );
    const otherSession = await loginUser(`other-list-${runId}@example.com`);
    await request(app)
      .get(paths.lessons)
      .set("Authorization", `Bearer ${otherSession.token}`)
      .query({ from: rangeDay.from, to: rangeDay.to, studentId: sid })
      .expect(403);
    await db.delete(users).where(eq(users.id, otherParent.id));
  });
});

describe("GET /api/v1/lessons/:lessonId", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `lessons-get-admin-${runId}@example.com`;
  const parentEmail = `lessons-get-parent-${runId}@example.com`;
  const tutorEmail = `lessons-get-tutor-${runId}@example.com`;
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

  async function seedWithLesson() {
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
        firstName: "Get",
        lastName: "Pupil",
        dateOfBirth: "2012-03-15T12:00:00.000Z",
      })
      .expect(201);
    const sid = studentRes.body.id as string;
    studentId = sid;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `GetSubject-${runId}` })
      .expect(201);
    const subjId = subRes.body.id as string;
    subjectId = subjId;

    await request(app)
      .post(paths.studentSubjects(sid))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ subjectId: subjId })
      .expect(201);

    const lessonRes = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        studentId: sid,
        tutorId: tutor.id,
        subjectId: subjId,
        startsAt: "2026-04-01T14:00:00.000Z",
        endsAt: "2026-04-01T15:00:00.000Z",
      })
      .expect(201);

    return {
      adminSession,
      parentSession: await loginUser(parentEmail),
      tutorSession: await loginUser(tutorEmail),
      lessonId: lessonRes.body.id as string,
    };
  }

  it("allows admin, owning parent, and tutor; forbids others", async () => {
    const { adminSession, parentSession, tutorSession, lessonId } =
      await seedWithLesson();

    const otherParent = await insertUserWithRole(
      `other-get-${runId}@example.com`,
      "parent",
    );
    const otherParentSession = await loginUser(`other-get-${runId}@example.com`);

    await request(app)
      .get(paths.lesson(lessonId))
      .set("Authorization", `Bearer ${otherParentSession.token}`)
      .expect(403);

    const otherTutor = await insertUserWithRole(
      `other-tutor-get-${runId}@example.com`,
      "tutor",
    );
    const otherTutorSession = await loginUser(`other-tutor-get-${runId}@example.com`);

    await request(app)
      .get(paths.lesson(lessonId))
      .set("Authorization", `Bearer ${otherTutorSession.token}`)
      .expect(403);

    await db.delete(users).where(eq(users.id, otherParent.id));
    await db.delete(users).where(eq(users.id, otherTutor.id));

    for (const token of [adminSession.token, parentSession.token, tutorSession.token]) {
      const res = await request(app)
        .get(paths.lesson(lessonId))
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.id).toBe(lessonId);
    }
  });
});

describe("POST /api/v1/lessons/:lessonId/cancel", () => {
  const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `lessons-cancel-admin-${runId}@example.com`;
  const parentEmail = `lessons-cancel-parent-${runId}@example.com`;
  const tutorEmail = `lessons-cancel-tutor-${runId}@example.com`;
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

  async function seedWithLesson() {
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
        firstName: "Cancel",
        lastName: "Pupil",
        dateOfBirth: "2012-03-15T12:00:00.000Z",
      })
      .expect(201);
    const sid = studentRes.body.id as string;
    studentId = sid;

    const subRes = await request(app)
      .post(paths.subjects)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ name: `CancelSubject-${runId}` })
      .expect(201);
    const subjId = subRes.body.id as string;
    subjectId = subjId;

    await request(app)
      .post(paths.studentSubjects(sid))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({ subjectId: subjId })
      .expect(201);

    const lessonRes = await request(app)
      .post(paths.lessons)
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({
        studentId: sid,
        tutorId: tutor.id,
        subjectId: subjId,
        startsAt: "2026-04-01T14:00:00.000Z",
        endsAt: "2026-04-01T15:00:00.000Z",
      })
      .expect(201);

    return {
      adminSession,
      parentSession: await loginUser(parentEmail),
      tutorSession: await loginUser(tutorEmail),
      lessonId: lessonRes.body.id as string,
    };
  }

  it("parent and unrelated tutor forbidden; assigned tutor cancels; second cancel is idempotent", async () => {
    const { parentSession, tutorSession, lessonId } = await seedWithLesson();

    await request(app)
      .post(paths.lessonCancel(lessonId))
      .set("Authorization", `Bearer ${parentSession.token}`)
      .send({})
      .expect(403);

    const otherTutor = await insertUserWithRole(
      `other-tutor-cancel-${runId}@example.com`,
      "tutor",
    );
    const otherSession = await loginUser(`other-tutor-cancel-${runId}@example.com`);

    await request(app)
      .post(paths.lessonCancel(lessonId))
      .set("Authorization", `Bearer ${otherSession.token}`)
      .send({})
      .expect(403);

    await db.delete(users).where(eq(users.id, otherTutor.id));

    const first = await request(app)
      .post(paths.lessonCancel(lessonId))
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({})
      .expect(200);
    expect(first.body.status).toBe("cancelled");

    const again = await request(app)
      .post(paths.lessonCancel(lessonId))
      .set("Authorization", `Bearer ${tutorSession.token}`)
      .send({})
      .expect(200);
    expect(again.body.status).toBe("cancelled");
    expect(again.body.id).toBe(lessonId);
  });

  it("returns 400 when lesson is completed", async () => {
    const { adminSession, lessonId } = await seedWithLesson();

    await db.update(lessons).set({ status: "completed" }).where(eq(lessons.id, lessonId));

    await request(app)
      .post(paths.lessonCancel(lessonId))
      .set("Authorization", `Bearer ${adminSession.token}`)
      .send({})
      .expect(400);
  });
});
