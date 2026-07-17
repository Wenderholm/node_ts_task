import type { ApiErrorResponse } from "../../../shared/types.js";

const API_BASE_URL = "http://localhost:3000";

export interface ApiRequestOptions extends RequestInit {}

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function getErrorMessage(
  error: unknown,
  fallback = "Wystąpił błąd aplikacji.",
): string {
  if (error instanceof TypeError) {
    return "Brak połączenia z serwerem lub serwer nie działa.";
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

async function safeJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Serwer zwrócił niepoprawną odpowiedź JSON.");
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  const response = await fetch(getApiUrl(path), {
    credentials: init.credentials ?? "include",
    ...init,
  });

  const text = await response.text();
  if (!response.ok) {
    let backendMessage: string | undefined;
    try {
      const parsed = JSON.parse(text);
      backendMessage =
        parsed && typeof parsed === "object" && "error" in parsed
          ? parsed.error
          : undefined;
    } catch {
      /* non-JSON body */
    }
    throw new Error(backendMessage || `Błąd HTTP ${response.status}`);
  }

  if (!text) return null;
  return JSON.parse(text) as T;
}
