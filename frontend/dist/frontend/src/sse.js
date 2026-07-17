import { getApiUrl } from "./services/api.js";
import { showMessage, showNotification } from "./ui/feedback.js";
export function setupSSE() {
    const eventSource = new EventSource(getApiUrl("/sse"));
    eventSource.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            showNotification(`SSE: ${message.event} - Car ID: ${message.carId}, Buyer ID: ${message.buyerId}`);
        }
        catch {
            showMessage("Błąd odczytu danych SSE", "error");
        }
    };
}
