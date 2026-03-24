import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { paths } from "./helpers.js";

describe("GET /api/v1/health", () => {
  it("returns 200 and a status message", async () => {
    const res = await request(app)
      .get(paths.health)
      .expect(200)
      .expect("Content-Type", /json/);

    expect(res.body).toEqual({ message: "API is running" });
  });
});
