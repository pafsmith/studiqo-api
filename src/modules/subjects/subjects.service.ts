import { Request } from "express";
import { CreateSubjectRequest, CreateSubjectResponse } from "./subjects.types.js";
import { subjectsRepository } from "./subjects.repository.js";
import { toSubjectResponse } from "./subjects.mapper.js";

export const subjectsService = {
  createSubject: async (req: Request, subject: CreateSubjectRequest): Promise<CreateSubjectResponse> => {
    const newSubject = await subjectsRepository.createSubject(subject);
    return toSubjectResponse(newSubject);
  },
};
