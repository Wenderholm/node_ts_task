export type Role = "admin" | "user";

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  balance: number;
}

export interface SafeUser {
  id: string;
  username: string;
  role: Role;
  balance: number;
}

export interface Car {
  id: string;
  model: string;
  price: number;
  ownerId: string | null;
}
export interface CarWithOwnerName extends Car {
  ownerName: string | null;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role?: Role;
  balance?: number;
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  role?: Role;
  balance?: number;
}

export interface CreateCarRequest {
  model: string;
  price: number;
  ownerId?: string | null;
}

export interface UpdateCarRequest {
  model?: string;
  price?: number;
  ownerId?: string | null;
}

export interface ApiErrorResponse {
  error?: string;
}

export interface CarBoughtEvent {
  event: string;
  carId: string;
  buyerId: string;
}
