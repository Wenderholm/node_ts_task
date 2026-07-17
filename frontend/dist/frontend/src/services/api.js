const API_BASE_URL = "http://localhost:3000";
export function getApiUrl(path) {
    return `${API_BASE_URL}${path}`;
}
export function getErrorMessage(error, fallback = "Wystąpił błąd aplikacji.") {
    if (error instanceof TypeError) {
        return "Brak połączenia z serwerem lub serwer nie działa.";
    }
    if (error instanceof Error) {
        return error.message || fallback;
    }
    return fallback;
}
async function safeJson(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("Serwer zwrócił niepoprawną odpowiedź JSON.");
    }
}
export async function apiRequest(path, init = {}) {
    const response = await fetch(getApiUrl(path), {
        credentials: init.credentials ?? "include",
        ...init,
    });
    const text = await response.text();
    if (!response.ok) {
        let backendMessage;
        try {
            const parsed = JSON.parse(text);
            backendMessage =
                parsed && typeof parsed === "object" && "error" in parsed
                    ? parsed.error
                    : undefined;
        }
        catch {
            /* non-JSON body */
        }
        throw new Error(backendMessage || `Błąd HTTP ${response.status}`);
    }
    if (!text)
        return null;
    return JSON.parse(text);
}
