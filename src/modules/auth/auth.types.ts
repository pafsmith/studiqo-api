export interface RegisterUserRequest {
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  id: string;
  email: string;
  createdAt: Date;
}

export interface LoginUserRequest {
  email: string;
  password: string;
}

export interface LoginUserResponse {
  id: string;
  email: string;
  createdAt: Date;
}
