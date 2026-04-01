import { NextFunction, Request, Response } from "express";
import { respondWithJSON } from "../../common/utils/json.js";
import { organizationsService } from "./organizations.service.js";

export const organizationsController = {
  createOrganization: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organization = await organizationsService.createOrganization(req, req.body);
      respondWithJSON(res, 201, organization);
    } catch (error) {
      next(error);
    }
  },

  listMyOrganizations: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizations = await organizationsService.listMyOrganizations(req);
      respondWithJSON(res, 200, organizations);
    } catch (error) {
      next(error);
    }
  },

  addOrganizationMember: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const member = await organizationsService.addOrganizationMember(
        req,
        String(req.params.organizationId),
        req.body,
      );
      respondWithJSON(res, 201, member);
    } catch (error) {
      next(error);
    }
  },

  listOrganizationMembers: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const members = await organizationsService.listOrganizationMembers(
        req,
        String(req.params.organizationId),
      );
      respondWithJSON(res, 200, members);
    } catch (error) {
      next(error);
    }
  },
};
