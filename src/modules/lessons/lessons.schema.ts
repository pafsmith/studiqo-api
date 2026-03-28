import { z } from "zod";

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
