import { Router } from "express";
import { authController } from "./auth.controller.js";
import {
  loginSchema,
  registerSchema,
  setActiveOrganizationSchema,
} from "./auth.schema.js";
import { authenticate } from "../../common/middleware/authenticate.middleware.js";
import { validate } from "../../common/middleware/validate.middleware.js";

export const authRoutes = Router();

authRoutes.post("/register", validate(registerSchema), authController.registerUser);
authRoutes.post("/login", validate(loginSchema), authController.loginUser);
authRoutes.post("/logout", authController.logoutUser);
authRoutes.get("/me", authenticate, authController.getMe);
authRoutes.post("/refresh", authController.refreshToken);
authRoutes.post(
  "/active-organization",
  authenticate,
  validate(setActiveOrganizationSchema),
  authController.setActiveOrganization,
);
