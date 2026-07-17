export type Role = "admin" | "user";

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

export interface ApiErrorResponse {
  error?: string;
}

export interface CarBoughtEvent {
  event: string;
  carId: string;
  buyerId: string;
}