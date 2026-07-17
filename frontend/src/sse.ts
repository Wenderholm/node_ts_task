import { getApiUrl } from "./services/api.js";
import type { CarBoughtEvent } from "../../shared/types.js";
import { showMessage, showNotification } from "./ui/feedback.js";

export function setupSSE(): void {
  const eventSource = new EventSource(getApiUrl("/sse"));

  eventSource.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as CarBoughtEvent;
      showNotification(
        `SSE: ${message.event} - Car ID: ${message.carId}, Buyer ID: ${message.buyerId}`,
      );
    } catch {
      showMessage("Błąd odczytu danych SSE", "error");
    }
  };
}
