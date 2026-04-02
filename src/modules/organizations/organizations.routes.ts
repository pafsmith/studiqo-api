import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { organizationsController } from "./organizations.controller.js";
import {
  addOrganizationMemberSchema,
  createOrganizationSchema,
  createOrganizationInvitationSchema,
  listOrganizationInvitationsSchema,
  listOrganizationMembersSchema,
  resendOrganizationInvitationSchema,
  revokeOrganizationInvitationSchema,
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
organizationsRoutes.post(
  "/:organizationId/invites",
  validate(createOrganizationInvitationSchema),
  organizationsController.createOrganizationInvitation,
);
organizationsRoutes.get(
  "/:organizationId/invites",
  validate(listOrganizationInvitationsSchema),
  organizationsController.listOrganizationInvitations,
);
organizationsRoutes.post(
  "/:organizationId/invites/:invitationId/resend",
  validate(resendOrganizationInvitationSchema),
  organizationsController.resendOrganizationInvitation,
);
organizationsRoutes.post(
  "/:organizationId/invites/:invitationId/revoke",
  validate(revokeOrganizationInvitationSchema),
  organizationsController.revokeOrganizationInvitation,
);
