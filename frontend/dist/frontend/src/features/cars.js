import { checkAuth } from "./auth.js";
import { getRequiredElement } from "../dom.js";
import { apiRequest, getErrorMessage } from "../services/api.js";
import { getCurrentUser } from "../state.js";
import { showMessage } from "../ui/feedback.js";
function encodeAttribute(value) {
    return encodeURIComponent(value);
}
// ustawienie nasluchiwania przycisków edycji i usuwania samochodów podlaczana podczas ladowania samochodow w loadCars() i po dodaniu/edycji/usunieciu samochodu
function attachCarActionListeners() {
    const carsList = getRequiredElement("cars-list");
    carsList
        .querySelectorAll(".edit-car-button")
        .forEach((button) => {
        button.addEventListener("click", () => {
            const { carId, carModel, carPrice } = button.dataset;
            if (!carId || !carModel || !carPrice) {
                return;
            }
            startEditCar(carId, decodeURIComponent(carModel), Number.parseFloat(carPrice));
        });
    });
    carsList
        .querySelectorAll(".delete-car-button")
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
function startEditCar(id, model, price) {
    getRequiredElement("editCarId").value = id;
    getRequiredElement("editCarModel").value = model;
    getRequiredElement("editCarPrice").value = String(price);
    getRequiredElement("editCarSection").style.display = "block";
    getRequiredElement("editCarSection").scrollIntoView({
        behavior: "smooth",
    });
}
async function deleteCar(id) {
    if (!window.confirm("Na pewno chcesz usunąć ten samochód?")) {
        return;
    }
    try {
        await apiRequest(`/cars/${id}`, { method: "DELETE" });
        showMessage("Samochód usunięty", "success");
        await loadCars("cars-list");
    }
    catch (error) {
        showMessage(getErrorMessage(error, "Błąd usuwania samochodu"), "error");
    }
}
// ladowanie listy samochodów i wyświetlanie ich w sekcji cars-list
// w zależności od parametrów showOwner i showActions, wyświetlane są odpowiednie informacje i przyciski akcji
// wykorzystane do wyswietlania informacji o autach w komplecie z przycikami
// albo dla kupna samochodów bez przycisków akcji i bez właściciela
export async function loadCars(containerId, showOwner = true, showActions = true) {
    try {
        const cars = (await apiRequest("/cars")) ?? [];
        const currentUser = getCurrentUser();
        let html = "";
        if (cars.length === 0) {
            html = "Brak samochodów.";
        }
        else {
            cars.forEach((car) => {
                html += `<div class="car-item">
                   <span class="car-item-info">
                     <strong>ID:</strong> ${car.id} 
                     <strong>Model:</strong> ${car.model} 
                     <strong>Cena:</strong> ${car.price} 
                     ${showOwner ? `<strong>Właściciel:</strong> ${car.ownerName}` : ""}
                   </span>
                 ${showActions
                    ? `<span class="car-item-actions" style="display: ${currentUser && currentUser.role === "admin" ? "inline" : "none"}">
                          <button class="edit-car-button" data-car-id="${car.id}" data-car-model="${encodeAttribute(car.model)}" data-car-price="${car.price}">Edytuj</button>
                           <button class="delete-car-button" data-car-id="${car.id}">Usuń</button>
                        </span>`
                    : ""}
                 </div>`;
            });
        }
        getRequiredElement(containerId).innerHTML = html;
        attachCarActionListeners();
    }
    catch (error) {
        showMessage(getErrorMessage(error, "Błąd przy pobieraniu samochodów"), "error");
    }
}
export async function loadOwnerOptions() {
    const currentUser = getCurrentUser();
    const ownerSelect = document.getElementById("carOwnerId");
    if (!(ownerSelect instanceof HTMLSelectElement)) {
        return;
    }
    if (!currentUser || currentUser.role !== "admin") {
        ownerSelect.style.display = "none";
        return;
    }
    const users = (await apiRequest("/users")) ?? [];
    ownerSelect.innerHTML = `
    <option value="">Brak właściciela</option>
    ${users.map((user) => `<option value="${user.id}">${user.username}</option>`).join("")}
  `;
    ownerSelect.style.display = "block";
}
// ustawi nasluchiwanie formularzy dodawania, edycji i kupowania samochodów
export function registerCarFormListeners() {
    const editCarForm = document.getElementById("editCarForm");
    if (editCarForm) {
        editCarForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const carId = getRequiredElement("editCarId").value;
            const model = getRequiredElement("editCarModel").value.trim();
            const price = Number.parseFloat(getRequiredElement("editCarPrice").value);
            if (!model || Number.isNaN(price) || price <= 0) {
                showMessage("Podaj poprawny model i cenę", "error");
                return;
            }
            try {
                await apiRequest(`/cars/${carId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model, price }),
                });
                showMessage("Samochód zaktualizowany", "success");
                getRequiredElement("editCarSection").style.display =
                    "none";
                await loadCars("cars-list");
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd edycji samochodu"), "error");
            }
        });
    }
    const cancelEditCar = document.getElementById("cancelEditCar");
    if (cancelEditCar) {
        cancelEditCar.addEventListener("click", () => {
            getRequiredElement("editCarSection").style.display =
                "none";
        });
    }
    const addCarForm = document.getElementById("addCarForm");
    if (addCarForm) {
        addCarForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const model = getRequiredElement("carModel").value;
            const price = Number.parseFloat(getRequiredElement("carPrice").value);
            const currentUser = getCurrentUser();
            const ownerSelect = document.getElementById("carOwnerId");
            const ownerId = ownerSelect instanceof HTMLSelectElement && ownerSelect.value
                ? ownerSelect.value
                : null;
            const payload = currentUser?.role === "admin"
                ? { model, price, ownerId }
                : { model, price };
            try {
                await apiRequest("/cars", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                showMessage("Samochód dodany", "success");
                await loadCars("cars-list");
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd dodawania samochodu"), "error");
            }
        });
    }
    const buyCarForm = document.getElementById("buyCarForm");
    if (buyCarForm) {
        buyCarForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const carId = getRequiredElement("buyCarId").value;
            try {
                await apiRequest(`/cars/${carId}/buy`, { method: "POST" });
                showMessage("Samochód zakupiony", "success");
                await loadCars("cars-list-buy", false, false);
                await checkAuth();
            }
            catch (error) {
                showMessage(getErrorMessage(error, "Błąd zakupu samochodu"), "error");
            }
        });
    }
}
