import { getRequiredElement } from "../dom.js";
import { getCurrentUser } from "../state.js";
export function renderNav() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        getRequiredElement("nav-profile").style.display = "inline";
        getRequiredElement("nav-cars").style.display = "inline";
        getRequiredElement("nav-buy").style.display = "inline";
        getRequiredElement("nav-logout").style.display = "inline";
        getRequiredElement("nav-login").style.display = "none";
        getRequiredElement("nav-register").style.display = "none";
        getRequiredElement("nav-admin").style.display =
            currentUser.role === "admin" ? "inline" : "none";
        getRequiredElement("user-info").innerText =
            `Hello: ${currentUser.username} | Role: ${currentUser.role} | Your balance: ${currentUser.balance}`;
        return;
    }
    getRequiredElement("nav-profile").style.display = "none";
    getRequiredElement("nav-cars").style.display = "none";
    getRequiredElement("nav-buy").style.display = "none";
    getRequiredElement("nav-logout").style.display = "none";
    getRequiredElement("nav-login").style.display = "inline";
    getRequiredElement("nav-register").style.display = "inline";
    getRequiredElement("nav-admin").style.display = "none";
    getRequiredElement("user-info").innerText = "Nie jesteś zalogowany";
}
export function showView(viewId) {
    const views = document.querySelectorAll(".view");
    views.forEach((view) => {
        view.style.display = "none";
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.style.display = "block";
    }
}
