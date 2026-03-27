export type StudentResponse = {
  id: string;
  parentId: string;
  tutorId: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
};

export type CreateStudentRequest = {
  parentId: string;
  tutorId: string;
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

export type StudentSubjectResponse = {
  subjectId: string;
  subjectName: string;
  currentGrade: string | null;
  predictedGrade: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EmergencyContactResponse = {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  relationship: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEmergencyContactRequest = {
  name: string;
  phone: string;
  relationship: string;
};

export type UpdateEmergencyContactRequest = {
  name?: string;
  phone?: string;
  relationship?: string;
};
