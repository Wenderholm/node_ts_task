import { getRequiredElement } from "../dom.js";

export function showMessage(text: string, type = "info"): void {
  const messageDiv = getRequiredElement<HTMLDivElement>("message");
  messageDiv.innerText = text;
  messageDiv.className = type;

  window.setTimeout(() => {
    messageDiv.innerText = "";
    messageDiv.className = "";
  }, 5000);
}

export function showNotification(text: string): void {
  const notificationDiv = getRequiredElement<HTMLDivElement>("notification");
  notificationDiv.innerText = text;

  window.setTimeout(() => {
    notificationDiv.innerText = "";
  }, 5000);
}
