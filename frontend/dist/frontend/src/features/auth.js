import { getRequiredElement } from "../dom.js";
import { apiRequest, getErrorMessage } from "../services/api.js";
import { getCurrentUser, setCurrentUser } from "../state.js";
import { showMessage } from "../ui/feedback.js";
import { renderNav } from "../ui/navigation.js";
export async function checkAuth() {
    try {
        const data = await apiRequest("/users");
        if (Array.isArray(data)) {
            setCurrentUser(data.find((user) => user.role === "admin") ?? null);
        }
        else {
            setCurrentUser(data ?? null);
        }
    }
    catch {
        setCurrentUser(null);
    }
    renderNav();
}
export async function loadProfile() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return;
    }
    try {
        const profile = await apiRequest(`/users/${currentUser.id}`);
        if (profile) {
            getRequiredElement("profile-info").innerText =
                `Username: ${profile.username}\nSaldo: ${profile.balance}`;
        }
    }
    catch (error) {
        showMessage(getErrorMessage(error, "Błąd przy pobieraniu profilu"), "error");
    }
}
export function registerAuthFormListeners() {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const username = getRequiredElement("loginUsername").value;
            const password = getRequiredElement("loginPassword").value;
            try {
                await apiRequest("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });
                showMessage("Zalogowano pomyślnie", "success");
                await checkAuth();
                window.location.hash = "#home";
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd logowania"), "error");
            }
        });
    }
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const username = getRequiredElement("regUsername").value;
            const password = getRequiredElement("regPassword").value;
            try {
                await apiRequest("/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                });
                showMessage("Rejestracja powiodła się, możesz się zalogować", "success");
                window.location.hash = "#login";
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd rejestracji"), "error");
            }
        });
    }
    const profileForm = document.getElementById("profileForm");
    if (profileForm) {
        profileForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const currentUser = getCurrentUser();
            if (!currentUser) {
                showMessage("Brak zalogowanego użytkownika", "error");
                return;
            }
            const newUsername = getRequiredElement("newUsername").value;
            const newPassword = getRequiredElement("newPassword").value;
            if (newUsername.trim() === "" || newPassword.trim() === "") {
                showMessage("Wszystkie pola są wymagane", "error");
                return;
            }
            try {
                await apiRequest(`/users/${currentUser.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: newUsername,
                        password: newPassword,
                    }),
                });
                showMessage("Profil zaktualizowany", "success");
                await checkAuth();
                await loadProfile();
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd aktualizacji profilu"), "error");
            }
        });
    }
}
export async function logout() {
    try {
        await apiRequest("/logout", { method: "POST" });
    }
    catch {
        // UI czyścimy nawet wtedy, gdy serwer nie odpowiedział.
    }
    setCurrentUser(null);
    renderNav();
    showMessage("Wylogowano");
    window.location.hash = "#home";
}
