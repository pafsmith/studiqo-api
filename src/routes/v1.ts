import { Router } from "express";

export const v1Router = Router();

v1Router.get("/health", (_req, res) => {
  res.status(200).json({ message: "API is running" });
});
