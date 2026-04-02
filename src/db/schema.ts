import {
  boolean,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
  uuid,
  pgEnum,
} from "drizzle-orm/pg-core";
export const organizationMembershipRoleEnum = pgEnum("organization_membership_role", [
  "org_admin",
  "tutor",
  "parent",
]);

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
  isSuperadmin: boolean("is_superadmin").notNull().default(false),
});

export type NewUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  name: varchar("name", { length: 256 }).notNull(),
  slug: varchar("slug", { length: 256 }).unique().notNull(),
});

export type NewOrganization = typeof organizations.$inferInsert;
export type Organization = typeof organizations.$inferSelect;

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: organizationMembershipRoleEnum("role").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_memberships_user_id_idx").on(table.userId),
    index("organization_memberships_organization_id_role_idx").on(
      table.organizationId,
      table.role,
    ),
  ],
);

export type NewOrganizationMembership = typeof organizationMemberships.$inferInsert;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type OrganizationMembershipRole =
  (typeof organizationMembershipRoleEnum.enumValues)[number];

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

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    email: varchar("email", { length: 256 }).notNull(),
    role: organizationMembershipRoleEnum("role").notNull(),
    tokenHash: varchar("token_hash", { length: 128 }).unique().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
  },
  (table) => [
    index("organization_invitations_organization_id_idx").on(table.organizationId),
    index("organization_invitations_email_idx").on(table.email),
    index("organization_invitations_organization_id_email_role_idx").on(
      table.organizationId,
      table.email,
      table.role,
    ),
    index("organization_invitations_expires_at_idx").on(table.expiresAt),
  ],
);

export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert;
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect;

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
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  firstName: varchar("first_name", { length: 256 }).notNull(),
  lastName: varchar("last_name", { length: 256 }).notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
});

export type NewStudent = typeof students.$inferInsert;
export type Student = typeof students.$inferSelect;

export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 256 }).notNull(),
  },
  (table) => [
    index("subjects_organization_id_idx").on(table.organizationId),
    index("subjects_organization_id_name_idx").on(table.organizationId, table.name),
  ],
);

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
    organizationId: uuid("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: lessonStatusEnum("status").notNull().default("scheduled"),
    notes: text("notes"),
  },
  (table) => [
    index("lessons_tutor_id_starts_at_idx").on(table.tutorId, table.startsAt),
    index("lessons_student_id_starts_at_idx").on(table.studentId, table.startsAt),
    index("lessons_organization_id_starts_at_idx").on(
      table.organizationId,
      table.startsAt,
    ),
  ],
);

export type NewLesson = typeof lessons.$inferInsert;
export type Lesson = typeof lessons.$inferSelect;
export type LessonStatus = (typeof lessonStatusEnum.enumValues)[number];
