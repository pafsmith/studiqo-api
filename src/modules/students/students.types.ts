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