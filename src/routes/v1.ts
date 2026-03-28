import { Router } from "express";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { studentsRoutes } from "../modules/students/students.routes.js";
import { usersRoutes } from "../modules/users/users.routes.js";
import { subjectsRoutes } from "../modules/subjects/subjects.routes.js";
import { lessonsRoutes } from "../modules/lessons/lessons.routes.js";

export const v1Router = Router();

v1Router.get("/health", (_req, res) => {
  res.status(200).json({ message: "API is running" });
});

v1Router.use("/auth", authRoutes);
v1Router.use("/students", studentsRoutes);
v1Router.use("/users", usersRoutes);
v1Router.use("/subjects", subjectsRoutes);
v1Router.use("/lessons", lessonsRoutes);
