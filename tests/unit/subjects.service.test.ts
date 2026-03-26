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
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    });

    const out = await subjectsService.createSubject({} as Request, {
      name: "Mathematics",
    });

    expect(subjectsRepository.createSubject).toHaveBeenCalledWith({
      name: "Mathematics",
    });
    expect(out).toEqual({
      id: "subj-1",
      name: "Mathematics",
    });
  });
});
