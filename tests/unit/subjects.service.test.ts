import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import { subjectsService } from "../../src/modules/subjects/subjects.service.js";
import { subjectsRepository } from "../../src/modules/subjects/subjects.repository.js";

vi.mock("../../src/modules/subjects/subjects.repository.js", () => ({
  subjectsRepository: {
    createSubject: vi.fn(),
  },
}));

describe("subjectsService createSubject", () => {
  beforeEach(() => {
    vi.mocked(subjectsRepository.createSubject).mockReset();
  });

  it("creates a subject and returns the mapped response", async () => {
    vi.mocked(subjectsRepository.createSubject).mockResolvedValue({
      id: "subj-1",
      name: "Mathematics",
      organizationId: "org-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });

    const out = await subjectsService.createSubject(
      {
        user: {
          id: "admin-1",
          email: "admin@example.com",
          hasedPassword: "h",
          role: "admin",
          isSuperadmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        organizationId: "org-1",
        organizationRole: "org_admin",
      } as Request,
      {
        name: "Mathematics",
      },
    );

    expect(subjectsRepository.createSubject).toHaveBeenCalledWith({
      name: "Mathematics",
      organizationId: "org-1",
    });
    expect(out).toEqual({
      id: "subj-1",
      name: "Mathematics",
    });
  });
});
