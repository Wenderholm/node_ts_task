import { checkAuth } from "./auth.js";
import { getRequiredElement } from "../dom.js";
import { apiRequest, getErrorMessage } from "../services/api.js";
import { getCurrentUser } from "../state.js";
import type { Car, CarWithOwnerName, SafeUser } from "../../../shared/types.js";
import { showMessage } from "../ui/feedback.js";

function encodeAttribute(value: string): string {
  return encodeURIComponent(value);
}
// ustawienie nasluchiwania przycisków edycji i usuwania samochodów podlaczana podczas ladowania samochodow w loadCars() i po dodaniu/edycji/usunieciu samochodu
function attachCarActionListeners(): void {
  const carsList = getRequiredElement<HTMLDivElement>("cars-list");

  carsList
    .querySelectorAll<HTMLButtonElement>(".edit-car-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const { carId, carModel, carPrice } = button.dataset;

        if (!carId || !carModel || !carPrice) {
          return;
        }

        startEditCar(
          carId,
          decodeURIComponent(carModel),
          Number.parseFloat(carPrice),
        );
      });
    });

  carsList
    .querySelectorAll<HTMLButtonElement>(".delete-car-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const { carId } = button.dataset;

        if (!carId) {
          return;
        }

        await deleteCar(carId);
      });
    });
}
// funkcja do ustawienia wartości w formularzu edycji samochodu i pokazania sekcji edycji
// wykorzystana w attachCarActionListeners() przy kliknięciu przycisku edycji samochodu
function startEditCar(id: string, model: string, price: number): void {
  getRequiredElement<HTMLInputElement>("editCarId").value = id;
  getRequiredElement<HTMLInputElement>("editCarModel").value = model;
  getRequiredElement<HTMLInputElement>("editCarPrice").value = String(price);
  getRequiredElement<HTMLDivElement>("editCarSection").style.display = "block";
  getRequiredElement<HTMLDivElement>("editCarSection").scrollIntoView({
    behavior: "smooth",
  });
}

async function deleteCar(id: string): Promise<void> {
  if (!window.confirm("Na pewno chcesz usunąć ten samochód?")) {
    return;
  }

  try {
    await apiRequest<{ status: string }>(`/cars/${id}`, { method: "DELETE" });
    showMessage("Samochód usunięty", "success");
    await loadCars("cars-list");
  } catch (error) {
    showMessage(getErrorMessage(error, "Błąd usuwania samochodu"), "error");
  }
}
// ladowanie listy samochodów i wyświetlanie ich w sekcji cars-list
// w zależności od parametrów showOwner i showActions, wyświetlane są odpowiednie informacje i przyciski akcji
// wykorzystane do wyswietlania informacji o autach w komplecie z przycikami
// albo dla kupna samochodów bez przycisków akcji i bez właściciela
export async function loadCars(
  containerId: "cars-list" | "cars-list-buy",
  showOwner: boolean = true,
  showActions: boolean = true,
): Promise<void> {
  try {
    const cars = (await apiRequest<CarWithOwnerName[]>("/cars")) ?? [];
    const currentUser = getCurrentUser();

    let html = "";
    if (cars.length === 0) {
      html = "Brak samochodów.";
    } else {
      cars.forEach((car) => {
        html += `<div class="car-item">
                   <span class="car-item-info">
                     <strong>ID:</strong> ${car.id} 
                     <strong>Model:</strong> ${car.model} 
                     <strong>Cena:</strong> ${car.price} 
                     ${showOwner ? `<strong>Właściciel:</strong> ${car.ownerName}` : ""}
                   </span>
                 ${
                   showActions
                     ? `<span class="car-item-actions" style="display: ${currentUser && currentUser.role === "admin" ? "inline" : "none"}">
                          <button class="edit-car-button" data-car-id="${car.id}" data-car-model="${encodeAttribute(car.model)}" data-car-price="${car.price}">Edytuj</button>
                           <button class="delete-car-button" data-car-id="${car.id}">Usuń</button>
                        </span>`
                     : ""
                 }
                 </div>`;
      });
    }

    getRequiredElement<HTMLDivElement>(containerId).innerHTML = html;
    attachCarActionListeners();
  } catch (error) {
    showMessage(
      getErrorMessage(error, "Błąd przy pobieraniu samochodów"),
      "error",
    );
  }
}
// funkcja do wyswietlania aktualnych uzytkownikow jako opcja podczas dodawania auta
export async function loadOwnerOptions(): Promise<void> {
  const currentUser = getCurrentUser();
  const ownerSelect = document.getElementById("carOwnerId");

  if (!(ownerSelect instanceof HTMLSelectElement)) {
    return;
  }

  if (!currentUser || currentUser.role !== "admin") {
    ownerSelect.style.display = "none";
    return;
  }

  const users = (await apiRequest<SafeUser[]>("/users")) ?? [];

  ownerSelect.innerHTML = `
    <option value="">Brak właściciela</option>
    ${users.map((user) => `<option value="${user.id}">${user.username}</option>`).join("")}
  `;

  ownerSelect.style.display = "block";
}

// ustawi nasluchiwanie formularzy dodawania, edycji i kupowania samochodów
export function registerCarFormListeners(): void {
  const editCarForm = document.getElementById("editCarForm");
  if (editCarForm) {
    editCarForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const carId = getRequiredElement<HTMLInputElement>("editCarId").value;
      const model =
        getRequiredElement<HTMLInputElement>("editCarModel").value.trim();
      const price = Number.parseFloat(
        getRequiredElement<HTMLInputElement>("editCarPrice").value,
      );

      if (!model || Number.isNaN(price) || price <= 0) {
        showMessage("Podaj poprawny model i cenę", "error");
        return;
      }

      try {
        await apiRequest<Car>(`/cars/${carId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model, price }),
        });

        showMessage("Samochód zaktualizowany", "success");
        getRequiredElement<HTMLDivElement>("editCarSection").style.display =
          "none";
        await loadCars("cars-list");
      } catch (error) {
        showMessage(getErrorMessage(error, "Błąd edycji samochodu"), "error");
      }
    });
  }

  const cancelEditCar = document.getElementById("cancelEditCar");
  if (cancelEditCar) {
    cancelEditCar.addEventListener("click", () => {
      getRequiredElement<HTMLDivElement>("editCarSection").style.display =
        "none";
    });
  }

  const addCarForm = document.getElementById("addCarForm");
  if (addCarForm) {
    addCarForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const model = getRequiredElement<HTMLInputElement>("carModel").value;
      const price = Number.parseFloat(
        getRequiredElement<HTMLInputElement>("carPrice").value,
      );

      const currentUser = getCurrentUser();
      const ownerSelect = document.getElementById("carOwnerId");
      const ownerId =
        ownerSelect instanceof HTMLSelectElement && ownerSelect.value
          ? ownerSelect.value
          : null;

      const payload =
        currentUser?.role === "admin"
          ? { model, price, ownerId }
          : { model, price };

      try {
        await apiRequest<Car>("/cars", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        showMessage("Samochód dodany", "success");
        await loadCars("cars-list");
      } catch (error) {
        showMessage(
          getErrorMessage(error, "Błąd dodawania samochodu"),
          "error",
        );
      }
    });
  }

  const buyCarForm = document.getElementById("buyCarForm");
  if (buyCarForm) {
    buyCarForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const carId = getRequiredElement<HTMLInputElement>("buyCarId").value;

      try {
        await apiRequest<Car>(`/cars/${carId}/buy`, { method: "POST" });
        showMessage("Samochód zakupiony", "success");
        await loadCars("cars-list-buy", false, false);
        await checkAuth();
      } catch (error) {
        showMessage(getErrorMessage(error, "Błąd zakupu samochodu"), "error");
      }
    });
  }
}
