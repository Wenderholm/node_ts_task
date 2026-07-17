import { getRequiredElement } from "../dom.js";
export function showMessage(text, type = "info") {
    const messageDiv = getRequiredElement("message");
    messageDiv.innerText = text;
    messageDiv.className = type;
    window.setTimeout(() => {
        messageDiv.innerText = "";
        messageDiv.className = "";
    }, 5000);
}
export function showNotification(text) {
    const notificationDiv = getRequiredElement("notification");
    notificationDiv.innerText = text;
    window.setTimeout(() => {
        notificationDiv.innerText = "";
    }, 5000);
}
