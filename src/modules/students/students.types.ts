export type CreateStudentRequest = {
    parentId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
};

export type CreateStudentResponse = {
    id: string;
    parentId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
};