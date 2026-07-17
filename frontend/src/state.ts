import type { SafeUser } from "../../shared/types.js";

let currentUser: SafeUser | null = null;

export function getCurrentUser(): SafeUser | null {
  return currentUser;
}

export function setCurrentUser(user: SafeUser | null): void {
  currentUser = user;
}
