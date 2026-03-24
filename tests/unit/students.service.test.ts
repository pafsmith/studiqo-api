import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import type { User } from "../../src/db/schema.js";
import { studentsService } from "../../src/modules/students/students.service.js";
import { studentsRepository } from "../../src/modules/students/students.repository.js";
import { authRepository } from "../../src/modules/auth/auth.repository.js";
import { NotFoundError, UserForbiddenError } from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/students/students.repository.js", () => ({
  studentsRepository: {
    findAllStudents: vi.fn(),
    findStudentsByParentId: vi.fn(),
    createStudent: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/auth.repository.js", () => ({
  authRepository: {
    getUserById: vi.fn(),
  },
}));

function reqWithUser(user: User): Request {
  return { user } as Request;
}

describe("studentsService listStudents", () => {
  beforeEach(() => {
    vi.mocked(studentsRepository.findAllStudents).mockReset();
    vi.mocked(studentsRepository.findStudentsByParentId).mockReset();
  });

  it("returns all students for an admin", async () => {
    const dob = new Date("2012-03-04");
    vi.mocked(studentsRepository.findAllStudents).mockResolvedValue([
      {
        id: "s1",
        parentId: "p1",
        firstName: "A",
        lastName: "B",
        dateOfBirth: dob,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const out = await studentsService.listStudents(
      reqWithUser({
        id: "admin-1",
        email: "a@b.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    expect(studentsRepository.findAllStudents).toHaveBeenCalled();
    expect(studentsRepository.findStudentsByParentId).not.toHaveBeenCalled();
    expect(out).toEqual([
      {
        id: "s1",
        parentId: "p1",
        firstName: "A",
        lastName: "B",
        dateOfBirth: dob,
      },
    ]);
  });

  it("returns only the caller's students for a parent", async () => {
    const dob = new Date("2011-01-02");
    vi.mocked(studentsRepository.findStudentsByParentId).mockResolvedValue([
      {
        id: "s2",
        parentId: "par-1",
        firstName: "C",
        lastName: "D",
        dateOfBirth: dob,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const out = await studentsService.listStudents(
      reqWithUser({
        id: "par-1",
        email: "p@b.com",
        hasedPassword: "h",
        role: "parent",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    expect(studentsRepository.findStudentsByParentId).toHaveBeenCalledWith("par-1");
    expect(studentsRepository.findAllStudents).not.toHaveBeenCalled();
    expect(out).toEqual([
      {
        id: "s2",
        parentId: "par-1",
        firstName: "C",
        lastName: "D",
        dateOfBirth: dob,
      },
    ]);
  });

  it("rejects tutors", async () => {
    await expect(
      studentsService.listStudents(
        reqWithUser({
          id: "t1",
          email: "t@b.com",
          hasedPassword: "h",
          role: "tutor",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    ).rejects.toThrow(UserForbiddenError);

    expect(studentsRepository.findAllStudents).not.toHaveBeenCalled();
    expect(studentsRepository.findStudentsByParentId).not.toHaveBeenCalled();
  });
});

describe("studentsService createStudent", () => {
  beforeEach(() => {
    vi.mocked(authRepository.getUserById).mockReset();
    vi.mocked(studentsRepository.createStudent).mockReset();
  });

  it("rejects non-admins", async () => {
    await expect(
      studentsService.createStudent(
        reqWithUser({
          id: "par-1",
          email: "p@b.com",
          hasedPassword: "h",
          role: "parent",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        {
          parentId: "00000000-0000-4000-8000-000000000001",
          firstName: "X",
          lastName: "Y",
          dateOfBirth: new Date("2010-01-01"),
        },
      ),
    ).rejects.toThrow(UserForbiddenError);

    expect(authRepository.getUserById).not.toHaveBeenCalled();
    expect(studentsRepository.createStudent).not.toHaveBeenCalled();
  });

  it("rejects when parent user does not exist", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue(undefined);

    await expect(
      studentsService.createStudent(
        reqWithUser({
          id: "admin-1",
          email: "a@b.com",
          hasedPassword: "h",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        {
          parentId: "00000000-0000-4000-8000-000000000002",
          firstName: "X",
          lastName: "Y",
          dateOfBirth: new Date("2010-01-01"),
        },
      ),
    ).rejects.toThrow(NotFoundError);

    expect(studentsRepository.createStudent).not.toHaveBeenCalled();
  });

  it("rejects when linked user is not a parent", async () => {
    vi.mocked(authRepository.getUserById).mockResolvedValue({
      id: "admin-parent",
      email: "x@b.com",
      hasedPassword: "h",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      studentsService.createStudent(
        reqWithUser({
          id: "admin-1",
          email: "a@b.com",
          hasedPassword: "h",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        {
          parentId: "admin-parent",
          firstName: "X",
          lastName: "Y",
          dateOfBirth: new Date("2010-01-01"),
        },
      ),
    ).rejects.toThrow(UserForbiddenError);

    expect(studentsRepository.createStudent).not.toHaveBeenCalled();
  });

  it("creates a student and returns the API shape", async () => {
    const dob = new Date("2014-05-06");
    vi.mocked(authRepository.getUserById).mockResolvedValue({
      id: "par-uuid",
      email: "parent@b.com",
      hasedPassword: "h",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(studentsRepository.createStudent).mockResolvedValue({
      id: "new-student-id",
      parentId: "par-uuid",
      firstName: "Sam",
      lastName: "Lee",
      dateOfBirth: dob,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const out = await studentsService.createStudent(
      reqWithUser({
        id: "admin-1",
        email: "a@b.com",
        hasedPassword: "h",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      {
        parentId: "par-uuid",
        firstName: "Sam",
        lastName: "Lee",
        dateOfBirth: dob,
      },
    );

    expect(studentsRepository.createStudent).toHaveBeenCalledWith({
      parentId: "par-uuid",
      firstName: "Sam",
      lastName: "Lee",
      dateOfBirth: dob,
    });
    expect(out).toEqual({
      id: "new-student-id",
      parentId: "par-uuid",
      firstName: "Sam",
      lastName: "Lee",
      dateOfBirth: dob,
    });
  });
});
