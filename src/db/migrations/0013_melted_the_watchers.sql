CREATE TYPE "public"."organization_membership_role" AS ENUM('org_admin', 'tutor', 'parent');--> statement-breakpoint
CREATE TABLE "organization_memberships" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_membership_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_memberships_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(256) NOT NULL,
	"slug" varchar(256) NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "students" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_superadmin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_memberships_user_id_idx" ON "organization_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organization_memberships_organization_id_role_idx" ON "organization_memberships" USING btree ("organization_id","role");--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lessons_organization_id_starts_at_idx" ON "lessons" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "subjects_organization_id_idx" ON "subjects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "subjects_organization_id_name_idx" ON "subjects" USING btree ("organization_id","name");
--> statement-breakpoint
INSERT INTO "organizations" ("name", "slug")
VALUES ('Default Organization', 'default-organization')
ON CONFLICT ("slug") DO NOTHING;--> statement-breakpoint
UPDATE "students"
SET "organization_id" = org.id
FROM "organizations" org
WHERE org.slug = 'default-organization'
  AND "students"."organization_id" IS NULL;--> statement-breakpoint
UPDATE "lessons"
SET "organization_id" = "students"."organization_id"
FROM "students"
WHERE "lessons"."student_id" = "students"."id"
  AND "lessons"."organization_id" IS NULL;--> statement-breakpoint
INSERT INTO "organization_memberships" ("organization_id", "user_id", "role")
SELECT
  org.id,
  u.id,
  CASE
    WHEN u.role = 'admin' THEN 'org_admin'::organization_membership_role
    WHEN u.role = 'tutor' THEN 'tutor'::organization_membership_role
    ELSE 'parent'::organization_membership_role
  END
FROM "users" u
JOIN "organizations" org ON org.slug = 'default-organization'
ON CONFLICT ("organization_id", "user_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "students" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ALTER COLUMN "organization_id" SET NOT NULL;