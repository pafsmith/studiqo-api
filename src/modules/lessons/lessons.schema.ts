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
