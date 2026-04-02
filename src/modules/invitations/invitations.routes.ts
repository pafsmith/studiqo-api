import { Router } from "express";
import { validate } from "../../common/middleware/validate.middleware.js";
import { invitationsController } from "./invitations.controller.js";
import {
  acceptInvitationSchema,
  invitationTokenParamsSchema,
} from "./invitations.schema.js";

export const invitationsRoutes = Router();

invitationsRoutes.get(
  "/:token",
  validate(invitationTokenParamsSchema),
  invitationsController.getInvitationDetails,
);
invitationsRoutes.post(
  "/:token/accept",
  validate(acceptInvitationSchema),
  invitationsController.acceptInvitation,
);
