import { z } from "zod";

const listLessonsQueryObject = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    studentId: z.string().uuid().optional(),
    tutorId: z.string().uuid().optional(),
  })
  .strict()
  .refine((q) => q.to > q.from, {
    message: "to must be after from",
    path: ["to"],
  });

export const listLessonsQuerySchema = z.object({
  query: listLessonsQueryObject,
});

export const getLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid(),
  }),
});

export const cancelLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid(),
  }),
  body: z.object({}).strict().optional().default({}),
});

export const createLessonSchema = z.object({
  body: z
    .object({
      studentId: z.string().uuid(),
      tutorId: z.string().uuid(),
      subjectId: z.string().uuid(),
      startsAt: z.coerce.date(),
      endsAt: z.coerce.date(),
    })
    .strict()
    .refine((body) => body.endsAt > body.startsAt, {
      message: "endsAt must be after startsAt",
      path: ["endsAt"],
    }),
});

const updateLessonBodySchema = z
  .object({
    tutorId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    notes: z.string().min(1).nullable().optional(),
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field must be provided",
  })
  .refine(
    (body) => {
      if (body.startsAt !== undefined && body.endsAt !== undefined) {
        return body.endsAt > body.startsAt;
      }
      return true;
    },
    { message: "endsAt must be after startsAt", path: ["endsAt"] },
  );

export const updateLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid(),
  }),
  body: updateLessonBodySchema,
});

export const completeLessonSchema = z.object({
  params: z.object({
    lessonId: z.string().uuid(),
  }),
  body: z.object({}).strict().optional().default({}),
});
