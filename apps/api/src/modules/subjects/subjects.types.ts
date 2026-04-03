export type CreateSubjectRequest = {
  name: string;
  organizationId?: string | null;
};

export type SubjectResponse = {
  id: string;
  name: string;
};

export type CreateSubjectResponse = SubjectResponse;
export type ListSubjectsResponse = SubjectResponse[];
