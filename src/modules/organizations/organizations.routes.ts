import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { organizationsController } from "./organizations.controller.js";
import {
  addOrganizationMemberSchema,
  createOrganizationSchema,
  listOrganizationMembersSchema,
} from "./organizations.schema.js";

export const organizationsRoutes = Router();

organizationsRoutes.use(authenticate);

organizationsRoutes.get("/", organizationsController.listMyOrganizations);
organizationsRoutes.post(
  "/",
  validate(createOrganizationSchema),
  organizationsController.createOrganization,
);
organizationsRoutes.get(
  "/:organizationId/members",
  validate(listOrganizationMembersSchema),
  organizationsController.listOrganizationMembers,
);
organizationsRoutes.post(
  "/:organizationId/members",
  validate(addOrganizationMemberSchema),
  organizationsController.addOrganizationMember,
);
