export type StudentResponse = {
  id: string;
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
};

export type CreateStudentRequest = {
  parentId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
};

export type CreateStudentResponse = StudentResponse;

export type UpdateStudentRequest = Partial<CreateStudentRequest>;

export type UpdateStudentResponse = StudentResponse;

export type LinkStudentSubjectRequest = {
  subjectId: string;
  currentGrade?: string;
  predictedGrade?: string;
};

export type StudentSubjectLinkResponse = {
  studentId: string;
  subjectId: string;
  currentGrade: string | null;
  predictedGrade: string | null;
  createdAt: Date;
  updatedAt: Date;
};
