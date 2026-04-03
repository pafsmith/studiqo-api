import { Router } from "express";
import {
  authenticate,
  requireAdmin,
} from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { usersController } from "./users.controller.js";
import { deleteUserSchema, updateUserSchema } from "./users.schema.js";

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.put(
  "/:userId",
  requireAdmin,
  validate(updateUserSchema),
  usersController.updateUser,
);
usersRoutes.delete(
  "/:userId",
  requireAdmin,
  validate(deleteUserSchema),
  usersController.deleteUser,
);
