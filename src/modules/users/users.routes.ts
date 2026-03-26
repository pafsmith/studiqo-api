import { Router } from "express";
import { authenticate } from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";
import { usersController } from "./users.controller.js";
import { updateUserSchema } from "./users.schema.js";

export const usersRoutes = Router();

usersRoutes.use(authenticate);

usersRoutes.put("/:userId", validate(updateUserSchema), usersController.updateUser);
