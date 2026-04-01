import { Request } from "express";
import {
  requireAdminUser,
  requireOrganizationContext,
} from "../../common/middleware/authenticate.middleware.js";
import {
  CreateSubjectRequest,
  CreateSubjectResponse,
  ListSubjectsResponse,
} from "./subjects.types.js";
import { subjectsRepository } from "./subjects.repository.js";
import { toSubjectResponse } from "./subjects.mapper.js";

export const subjectsService = {
  createSubject: async (
    req: Request,
    subject: CreateSubjectRequest,
  ): Promise<CreateSubjectResponse> => {
    requireAdminUser(req);
    const { organizationId } = requireOrganizationContext(req);
    const newSubject = await subjectsRepository.createSubject({
      ...subject,
      organizationId: subject.organizationId ?? organizationId,
    });
    return toSubjectResponse(newSubject);
  },

  listSubjects: async (req: Request): Promise<ListSubjectsResponse> => {
    const { organizationId } = requireOrganizationContext(req);
    const rows = await subjectsRepository.listForOrganization(organizationId);
    return rows.map(toSubjectResponse);
  },
};
