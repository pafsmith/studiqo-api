import { Router } from "express";
import { authController } from "./auth.controller.js"
import { registerSchema } from "./auth.schema.js";
import { validate } from "../../common/middleware/validate.middleware.js";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), authController.registerUser);