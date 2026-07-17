import { loadProfile, logout } from "./features/auth.js";
import { loadCars, loadOwnerOptions } from "./features/cars.js";
import { loadAdminUsers } from "./features/users.js";
import { showView } from "./ui/navigation.js";

export function route(): void {
  const hash = window.location.hash || "#home";
  const viewId = `${hash.substring(1)}-view`;

  if (hash === "#logout") {
    void logout();
    return;
  }

  showView(viewId);

  if (viewId === "profile-view") {
    void loadProfile();
  }

  if (viewId === "cars-view") {
    void loadCars("cars-list");
    void loadOwnerOptions();
  }

  if (viewId === "buy-view") {
    void loadCars("cars-list-buy", false, false);
  }

  if (viewId === "admin-view") {
    void loadAdminUsers();
  }
}
