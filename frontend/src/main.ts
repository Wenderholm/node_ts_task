import { checkAuth, registerAuthFormListeners } from "./features/auth.js";
import { registerCarFormListeners } from "./features/cars.js";
import { registerUserFormListeners } from "./features/users.js";
import { route } from "./router.js";
import { setupSSE } from "./sse.js";

function setupEventListeners(): void {
  window.addEventListener("hashchange", route);
  // window.addEventListener("hashchange", route) wywoła route() kiedy zmieni się location.hash (np. z #/login na #/cars).
  // aplikacja używa #‑based routing — zmiana hash → bez przeładowania strony wyświetlany jest inny widok.
  route();

  // podlaczenie nasluchiwania formularzy
  registerAuthFormListeners();
  registerCarFormListeners();
  registerUserFormListeners();
}

window.addEventListener("load", async () => {
  // sprawdzenie czy uzytkownik jest zalogowany i ustawienie odpowiednich elementów w nawigacji
  await checkAuth();
  setupEventListeners();
  //
  setupSSE();
});
