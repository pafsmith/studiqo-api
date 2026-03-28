import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["tutor", "parent", "admin"]);

export const lessonStatusEnum = pgEnum("lesson_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  email: varchar("email", { length: 256 }).unique().notNull(),
  hasedPassword: varchar("hased_password", { length: 256 }).notNull(),
  // TODO: Remove — default new registrations to a non-admin role (e.g. student) once signup chooses role or admins assign it.
  role: userRoleEnum("role").notNull().default("admin"),
});

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserRole = (typeof userRoleEnum.enumValues)[number];

export const refreshTokens = pgTable("refresh_tokens", {
  token: varchar("token", { length: 256 }).primaryKey().notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  parentId: uuid("parent_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tutorId: uuid("tutor_id").references(() => users.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 256 }).notNull(),
  lastName: varchar("last_name", { length: 256 }).notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
});

export type NewStudent = typeof students.$inferInsert;
export type Student = typeof students.$inferSelect;

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: varchar("name", { length: 256 }).notNull(),
});

export type NewSubject = typeof subjects.$inferInsert;
export type Subject = typeof subjects.$inferSelect;

export const studentSubjects = pgTable(
  "student_subjects",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    currentGrade: varchar("current_grade", { length: 32 }),
    predictedGrade: varchar("predicted_grade", { length: 32 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.studentId, table.subjectId] })],
);

export type NewStudentSubject = typeof studentSubjects.$inferInsert;
export type StudentSubject = typeof studentSubjects.$inferSelect;

export const emergencyContacts = pgTable("emergency_contacts", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  studentId: uuid("student_id")
    .references(() => students.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  relationship: varchar("relationship", { length: 64 }).notNull(),
});

export type NewEmergencyContact = typeof emergencyContacts.$inferInsert;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    studentId: uuid("student_id")
      .references(() => students.id, { onDelete: "cascade" })
      .notNull(),
    tutorId: uuid("tutor_id")
      .references(() => users.id, { onDelete: "restrict" })
      .notNull(),
    subjectId: uuid("subject_id")
      .references(() => subjects.id, { onDelete: "restrict" })
      .notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: lessonStatusEnum("status").notNull().default("scheduled"),
    notes: text("notes"),
  },
  (table) => [
    index("lessons_tutor_id_starts_at_idx").on(table.tutorId, table.startsAt),
    index("lessons_student_id_starts_at_idx").on(table.studentId, table.startsAt),
  ],
);

export type NewLesson = typeof lessons.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type LessonStatus = (typeof lessonStatusEnum.enumValues)[number];
