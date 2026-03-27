import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import type { User } from "../../src/db/schema.js";
import { studentsService } from "../../src/modules/students/students.service.js";
import { studentsRepository } from "../../src/modules/students/students.repository.js";
import { studentSubjectsRepository } from "../../src/modules/students/student-subjects.repository.js";
import { usersRepository } from "../../src/modules/users/users.repository.js";
import { NotFoundError, UserForbiddenError } from "../../src/common/errors/errors.js";

vi.mock("../../src/modules/students/students.repository.js", () => ({
  studentsRepository: {
    findAllStudents: vi.fn(),
    findStudentsByParentId: vi.fn(),
    findStudentByTutorId: vi.fn(),
    createStudent: vi.fn(),
    findStudentById: vi.fn(),
    updateStudent: vi.fn(),
    deleteStudentById: vi.fn(),
  },
}));

vi.mock("../../src/modules/students/student-subjects.repository.js", () => ({
  studentSubjectsRepository: {
    findByStudentAndSubject: vi.fn(),
    findSubjectsByStudentId: vi.fn(),
    insertStudentSubject: vi.fn(),
  },
}));

vi.mock("../../src/modules/users/users.repository.js", () => ({
  usersRepository: {
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
        tutorId: null,
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
        tutorId: null,
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
        tutorId: null,
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
        tutorId: null,
        firstName: "C",
        lastName: "D",
        dateOfBirth: dob,
      },
    ]);
  });

  it("returns only the tutor's assigned students for a tutor", async () => {
    const dob = new Date("2010-01-01");
    vi.mocked(studentsRepository.findStudentByTutorId).mockResolvedValue([
      {
        id: "s3",
        parentId: "par-1",
        tutorId: "t1",
        firstName: "E",
        lastName: "F",
        dateOfBirth: dob,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const out = await studentsService.listStudents(
      reqWithUser({
        id: "t1",
        email: "t@b.com",
        hasedPassword: "h",
        role: "tutor",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    expect(studentsRepository.findStudentByTutorId).toHaveBeenCalledWith("t1");
    expect(studentsRepository.findAllStudents).not.toHaveBeenCalled();
    expect(studentsRepository.findStudentsByParentId).not.toHaveBeenCalled();
    expect(out).toEqual([
      {
        id: "s3",
        parentId: "par-1",
        tutorId: "t1",
        firstName: "E",
        lastName: "F",
        dateOfBirth: dob,
      },
    ]);
  });
});

describe("studentsService createStudent", () => {
  beforeEach(() => {
    vi.mocked(usersRepository.getUserById).mockReset();
    vi.mocked(studentsRepository.createStudent).mockReset();
  });

  it("rejects when parent user does not exist", async () => {
    vi.mocked(usersRepository.getUserById).mockResolvedValue(undefined);

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
    vi.mocked(usersRepository.getUserById).mockResolvedValue({
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
    vi.mocked(usersRepository.getUserById).mockResolvedValue({
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
      tutorId: null,
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
      tutorId: null,
      firstName: "Sam",
      lastName: "Lee",
      dateOfBirth: dob,
    });
  });
});

describe("studentsService updateStudent", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const existingStudent = {
    id: "stu-1",
    parentId: "par-1",
    tutorId: null,
    firstName: "Kid",
    lastName: "A",
    dateOfBirth: new Date("2012-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(usersRepository.getUserById).mockReset();
    vi.mocked(studentsRepository.findStudentById).mockReset();
    vi.mocked(studentsRepository.updateStudent).mockReset();
  });

  it("returns 404 when student does not exist", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(undefined);

    await expect(
      studentsService.updateStudent(reqWithUser(adminUser), "missing-id", {
        firstName: "X",
      }),
    ).rejects.toThrow(NotFoundError);

    expect(studentsRepository.updateStudent).not.toHaveBeenCalled();
  });

  it("allows admin to update including parentId when new parent is valid", async () => {
    const newParentId = "00000000-0000-4000-8000-0000000000aa";
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(existingStudent);
    vi.mocked(usersRepository.getUserById).mockResolvedValue({
      id: newParentId,
      email: "other@b.com",
      hasedPassword: "h",
      role: "parent",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(studentsRepository.updateStudent).mockResolvedValue({
      ...existingStudent,
      parentId: newParentId,
      firstName: "Updated",
    });

    const out = await studentsService.updateStudent(reqWithUser(adminUser), "stu-1", {
      parentId: newParentId,
      firstName: "Updated",
    });

    expect(usersRepository.getUserById).toHaveBeenCalledWith(newParentId);
    expect(studentsRepository.updateStudent).toHaveBeenCalledWith("stu-1", {
      parentId: newParentId,
      firstName: "Updated",
    });
    expect(out.firstName).toBe("Updated");
    expect(out.parentId).toBe(newParentId);
  });

  it("rejects admin update when new parentId user is not a parent", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(existingStudent);
    vi.mocked(usersRepository.getUserById).mockResolvedValue({
      id: "admin-x",
      email: "x@b.com",
      hasedPassword: "h",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      studentsService.updateStudent(reqWithUser(adminUser), "stu-1", {
        parentId: "admin-x",
      }),
    ).rejects.toThrow(UserForbiddenError);

    expect(studentsRepository.updateStudent).not.toHaveBeenCalled();
  });
});

describe("studentsService deleteStudent", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(studentsRepository.deleteStudentById).mockReset();
  });

  it("throws NotFoundError when student does not exist", async () => {
    vi.mocked(studentsRepository.deleteStudentById).mockResolvedValue(false);

    await expect(
      studentsService.deleteStudent(reqWithUser(adminUser), "missing-id"),
    ).rejects.toThrow(NotFoundError);

    expect(studentsRepository.deleteStudentById).toHaveBeenCalledWith("missing-id");
  });

  it("deletes when admin and student exists", async () => {
    vi.mocked(studentsRepository.deleteStudentById).mockResolvedValue(true);

    await studentsService.deleteStudent(reqWithUser(adminUser), "stu-1");

    expect(studentsRepository.deleteStudentById).toHaveBeenCalledWith("stu-1");
  });
});

describe("studentsService getStudent", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const parentUser = {
    id: "parent-1",
    email: "parent@b.com",
    hasedPassword: "h",
    role: "parent" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tutorUser = {
    id: "tutor-1",
    email: "tutor@b.com",
    hasedPassword: "h",
    role: "tutor" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentWithParent = {
    id: "stu-1",
    parentId: "parent-1",
    tutorId: null as string | null,
    firstName: "Kid",
    lastName: "A",
    dateOfBirth: new Date("2012-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentWithTutor = {
    id: "stu-2",
    parentId: "parent-2",
    tutorId: "tutor-1",
    firstName: "Kid",
    lastName: "B",
    dateOfBirth: new Date("2013-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(studentsRepository.findStudentById).mockReset();
  });

  it("returns 404 when student does not exist", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(undefined);

    await expect(
      studentsService.getStudent(reqWithUser(adminUser), "missing-id"),
    ).rejects.toThrow(NotFoundError);
  });

  it("allows admin to view any student", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);

    const out = await studentsService.getStudent(reqWithUser(adminUser), "stu-1");

    expect(out).toEqual({
      id: "stu-1",
      parentId: "parent-1",
      tutorId: null,
      firstName: "Kid",
      lastName: "A",
      dateOfBirth: studentWithParent.dateOfBirth,
    });
  });

  it("allows parent to view their own student", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);

    const out = await studentsService.getStudent(reqWithUser(parentUser), "stu-1");

    expect(out).toEqual({
      id: "stu-1",
      parentId: "parent-1",
      tutorId: null,
      firstName: "Kid",
      lastName: "A",
      dateOfBirth: studentWithParent.dateOfBirth,
    });
  });

  it("forbids parent from viewing another parent's student", async () => {
    const otherParentStudent = {
      ...studentWithParent,
      parentId: "other-parent-id",
    };
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(otherParentStudent);

    await expect(
      studentsService.getStudent(reqWithUser(parentUser), "stu-1"),
    ).rejects.toThrow(UserForbiddenError);
  });

  it("allows tutor to view their assigned student", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithTutor);

    const out = await studentsService.getStudent(reqWithUser(tutorUser), "stu-2");

    expect(out).toEqual({
      id: "stu-2",
      parentId: "parent-2",
      tutorId: "tutor-1",
      firstName: "Kid",
      lastName: "B",
      dateOfBirth: studentWithTutor.dateOfBirth,
    });
  });

  it("forbids tutor from viewing unassigned student", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);

    await expect(
      studentsService.getStudent(reqWithUser(tutorUser), "stu-1"),
    ).rejects.toThrow(UserForbiddenError);
  });
});

describe("studentsService getStudentSubjects", () => {
  const adminUser = {
    id: "admin-1",
    email: "a@b.com",
    hasedPassword: "h",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const parentUser = {
    id: "parent-1",
    email: "parent@b.com",
    hasedPassword: "h",
    role: "parent" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const tutorUser = {
    id: "tutor-1",
    email: "tutor@b.com",
    hasedPassword: "h",
    role: "tutor" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentWithParent = {
    id: "stu-1",
    parentId: "parent-1",
    tutorId: null as string | null,
    firstName: "Kid",
    lastName: "A",
    dateOfBirth: new Date("2012-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const studentWithTutor = {
    id: "stu-2",
    parentId: "parent-2",
    tutorId: "tutor-1",
    firstName: "Kid",
    lastName: "B",
    dateOfBirth: new Date("2013-01-01"),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSubjects = [
    {
      subjectId: "sub-1",
      subjectName: "Math",
      currentGrade: "A",
      predictedGrade: "A*",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      subjectId: "sub-2",
      subjectName: "Science",
      currentGrade: "B",
      predictedGrade: "A",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.mocked(studentsRepository.findStudentById).mockReset();
    vi.mocked(studentSubjectsRepository.findSubjectsByStudentId).mockReset();
  });

  it("returns 404 when student does not exist", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(undefined);

    await expect(
      studentsService.getStudentSubjects(reqWithUser(adminUser), "missing-id"),
    ).rejects.toThrow(NotFoundError);
  });

  it("allows admin to view any student's subjects", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);
    vi.mocked(studentSubjectsRepository.findSubjectsByStudentId).mockResolvedValue(
      mockSubjects,
    );

    const out = await studentsService.getStudentSubjects(
      reqWithUser(adminUser),
      "stu-1",
    );

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      subjectId: "sub-1",
      subjectName: "Math",
      currentGrade: "A",
      predictedGrade: "A*",
    });
    expect(out[1]).toMatchObject({
      subjectId: "sub-2",
      subjectName: "Science",
      currentGrade: "B",
      predictedGrade: "A",
    });
  });

  it("returns empty array when student has no subjects", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);
    vi.mocked(studentSubjectsRepository.findSubjectsByStudentId).mockResolvedValue([]);

    const out = await studentsService.getStudentSubjects(
      reqWithUser(adminUser),
      "stu-1",
    );

    expect(out).toEqual([]);
  });

  it("allows parent to view their own student's subjects", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);
    vi.mocked(studentSubjectsRepository.findSubjectsByStudentId).mockResolvedValue(
      mockSubjects,
    );

    const out = await studentsService.getStudentSubjects(
      reqWithUser(parentUser),
      "stu-1",
    );

    expect(out).toHaveLength(2);
  });

  it("forbids parent from viewing another parent's student subjects", async () => {
    const otherParentStudent = {
      ...studentWithParent,
      parentId: "other-parent-id",
    };
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(otherParentStudent);

    await expect(
      studentsService.getStudentSubjects(reqWithUser(parentUser), "stu-1"),
    ).rejects.toThrow(UserForbiddenError);
  });

  it("allows tutor to view their assigned student's subjects", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithTutor);
    vi.mocked(studentSubjectsRepository.findSubjectsByStudentId).mockResolvedValue(
      mockSubjects,
    );

    const out = await studentsService.getStudentSubjects(
      reqWithUser(tutorUser),
      "stu-2",
    );

    expect(out).toHaveLength(2);
  });

  it("forbids tutor from viewing unassigned student's subjects", async () => {
    vi.mocked(studentsRepository.findStudentById).mockResolvedValue(studentWithParent);

    await expect(
      studentsService.getStudentSubjects(reqWithUser(tutorUser), "stu-1"),
    ).rejects.toThrow(UserForbiddenError);
  });
});
