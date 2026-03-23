import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";

export const v1Router = Router();

v1Router.get("/health", (_req, res) => {
  res.status(200).json({ message: "API is running" });
});

v1Router.use("/auth", authRoutes);
