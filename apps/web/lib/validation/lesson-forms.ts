import { z } from "zod";

const uuid = z.string().uuid();

export const lessonListRangeSchema = z
  .object({
    fromIso: z.string().min(1),
    toIso: z.string().min(1),
  })
  .refine(
    (d) => {
      const a = new Date(d.fromIso).getTime();
      const b = new Date(d.toIso).getTime();
      return !Number.isNaN(a) && !Number.isNaN(b) && b > a;
    },
    { message: "End must be after start", path: ["toIso"] },
  );

export type LessonListRange = z.infer<typeof lessonListRangeSchema>;

export const createLessonFormSchema = z
  .object({
    studentId: uuid,
    subjectId: uuid,
    startsAtLocal: z.string().min(1, "Start is required"),
    endsAtLocal: z.string().min(1, "End is required"),
  })
  .refine(
    (d) => {
      const s = new Date(d.startsAtLocal).getTime();
      const e = new Date(d.endsAtLocal).getTime();
      return !Number.isNaN(s) && !Number.isNaN(e) && e > s;
    },
    { message: "End must be after start", path: ["endsAtLocal"] },
  );

export type CreateLessonForm = z.infer<typeof createLessonFormSchema>;

export const updateLessonFormSchema = z
  .object({
    tutorId: z.union([uuid, z.literal("")]).optional(),
    subjectId: z.union([uuid, z.literal("")]).optional(),
    startsAtLocal: z.string().optional(),
    endsAtLocal: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasTutor = data.tutorId !== undefined && data.tutorId !== "";
      const hasSubject = data.subjectId !== undefined && data.subjectId !== "";
      const hasStart =
        data.startsAtLocal !== undefined && data.startsAtLocal.trim() !== "";
      const hasEnd =
        data.endsAtLocal !== undefined && data.endsAtLocal.trim() !== "";
      const hasNotes = data.notes !== undefined;
      return hasTutor || hasSubject || hasStart || hasEnd || hasNotes;
    },
    { message: "Change at least one field" },
  )
  .refine(
    (data) => {
      const hasStart =
        data.startsAtLocal !== undefined && data.startsAtLocal.trim() !== "";
      const hasEnd =
        data.endsAtLocal !== undefined && data.endsAtLocal.trim() !== "";
      if (hasStart !== hasEnd) {
        return false;
      }
      if (!hasStart || !hasEnd) {
        return true;
      }
      const s = new Date(data.startsAtLocal!).getTime();
      const e = new Date(data.endsAtLocal!).getTime();
      return !Number.isNaN(s) && !Number.isNaN(e) && e > s;
    },
    { message: "End must be after start", path: ["endsAtLocal"] },
  );

export type UpdateLessonForm = z.infer<typeof updateLessonFormSchema>;
