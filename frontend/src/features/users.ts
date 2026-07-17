import { getRequiredElement } from "../dom.js";
import { apiRequest, getErrorMessage } from "../services/api.js";
import { getCurrentUser } from "../state.js";
import type { Role, SafeUser } from "../../../shared/types.js";
import { showMessage } from "../ui/feedback.js";

function encodeAttribute(value: string): string {
  return encodeURIComponent(value);
}

function attachUserActionListeners(): void {
  const usersList = getRequiredElement<HTMLDivElement>("admin-users-list");

  usersList
    .querySelectorAll<HTMLButtonElement>(".edit-user-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const { userId, username, role, balance } = button.dataset;

        if (!userId || !username || !role || !balance) {
          return;
        }

        startEditUser(
          userId,
          decodeURIComponent(username),
          role as Role,
          Number.parseFloat(balance),
        );
      });
    });

  usersList
    .querySelectorAll<HTMLButtonElement>(".delete-user-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const { userId } = button.dataset;

        if (!userId) {
          return;
        }

        await deleteUser(userId);
      });
    });
}

function startEditUser(
  id: string,
  username: string,
  role: Role,
  balance: number,
): void {
  getRequiredElement<HTMLInputElement>("editUserId").value = id;
  getRequiredElement<HTMLInputElement>("editUsername").value = username;
  getRequiredElement<HTMLSelectElement>("editRole").value = role;
  getRequiredElement<HTMLInputElement>("editBalance").value = String(balance);
  getRequiredElement<HTMLDivElement>("editUserSection").style.display = "block";
  getRequiredElement<HTMLDivElement>("editUserSection").scrollIntoView({
    behavior: "smooth",
  });
}

async function deleteUser(id: string): Promise<void> {
  if (!window.confirm("Na pewno chcesz usunąć tego użytkownika?")) {
    return;
  }

  try {
    await apiRequest<{ status: string }>(`/users/${id}`, { method: "DELETE" });
    showMessage("Użytkownik usunięty", "success");
    await loadAdminUsers();
  } catch (error) {
    showMessage(getErrorMessage(error, "Błąd usuwania użytkownika"), "error");
  }
}

export async function loadAdminUsers(): Promise<void> {
  try {
    const users = (await apiRequest<SafeUser[]>("/users")) ?? [];
    const currentUser = getCurrentUser();

    let html = "";
    if (users.length === 0) {
      html = "Brak użytkowników.";
    } else {
      users.forEach((user) => {
        html += `<div class="user-item">
                  <span class="user-item-info">
                    <strong>ID:</strong> ${user.id}
                    <strong>Username:</strong> ${user.username}
                    <strong>Rola:</strong> ${user.role}
                    <strong>Saldo:</strong> ${user.balance}
                  </span>
                   <span class="user-item-actions" style="display: ${currentUser && currentUser.role === "admin" ? "inline" : "none"}">
                     <button class="edit-user-button" data-user-id="${user.id}" data-username="${encodeAttribute(user.username)}" data-role="${user.role}" data-balance="${user.balance}">Edytuj</button>
                     <button class="delete-user-button" data-user-id="${user.id}">Usuń</button>
                   </span>
                 </div>`;
      });
    }

    getRequiredElement<HTMLDivElement>("admin-users-list").innerHTML = html;
    attachUserActionListeners();
  } catch (error) {
    showMessage(
      getErrorMessage(error, "Błąd przy pobieraniu użytkowników"),
      "error",
    );
  }
}

export function registerUserFormListeners(): void {
  const editUserForm = document.getElementById("editUserForm");
  if (editUserForm) {
    editUserForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const userId = getRequiredElement<HTMLInputElement>("editUserId").value;
      const username =
        getRequiredElement<HTMLInputElement>("editUsername").value.trim();
      const role = getRequiredElement<HTMLSelectElement>("editRole")
        .value as Role;
      const balance = Number.parseFloat(
        getRequiredElement<HTMLInputElement>("editBalance").value,
      );

      if (!username || Number.isNaN(balance) || balance < 0) {
        showMessage("Podaj poprawne dane użytkownika", "error");
        return;
      }

      try {
        await apiRequest<SafeUser>(`/users/${userId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, role, balance }),
        });

        showMessage("Użytkownik zaktualizowany", "success");
        getRequiredElement<HTMLDivElement>("editUserSection").style.display =
          "none";
        await loadAdminUsers();
      } catch (error) {
        showMessage(getErrorMessage(error, "Błąd edycji użytkownika"), "error");
      }
    });
  }

  const cancelEditUser = document.getElementById("cancelEditUser");
  if (cancelEditUser) {
    cancelEditUser.addEventListener("click", () => {
      getRequiredElement<HTMLDivElement>("editUserSection").style.display =
        "none";
    });
  }

  const fundForm = document.getElementById("fundForm");
  if (fundForm) {
    fundForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const userId =
        getRequiredElement<HTMLInputElement>("fundUserId").value.trim();
      const amount = Number.parseFloat(
        getRequiredElement<HTMLInputElement>("fundAmount").value,
      );

      if (!userId || Number.isNaN(amount) || amount <= 0) {
        showMessage("Podaj poprawne ID i kwotę większą od 0", "error");
        return;
      }

      try {
        const updatedUser = await apiRequest<SafeUser>(
          `/users/${userId}/fund`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount }),
          },
        );

        showMessage(
          `Konto zasilone. Nowe saldo: ${updatedUser?.balance ?? amount}`,
          "success",
        );
        await loadAdminUsers();
      } catch (error) {
        showMessage(getErrorMessage(error, "Błąd zasilania konta"), "error");
      }
    });
  }
}
