export interface RegisterUserRequest {
    email: string;
    password: string;
}

export interface RegisterUserResponse {
    id: string;
    email: string;
    createdAt: Date;
}