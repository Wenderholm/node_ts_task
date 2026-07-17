import type { IncomingMessage, ServerResponse } from "http";
import {
  clearAuthCookie,
  generateToken,
  getAuthCookieName,
  getUserIdFromToken,
  parseCookies,
  setAuthCookie,
} from "./auth.js";
import { getCars, getUsers, saveCars, saveUsers } from "./db.js";
import type {
  Car,
  CreateCarRequest,
  CreateUserRequest,
  LoginRequest,
  RegisterRequest,
  SafeUser,
  UpdateCarRequest,
  UpdateUserRequest,
  User,
} from "../shared/types.js";

const sseClients = new Set<ServerResponse>();

export async function handleApiRequest(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", "http://localhost:3000");
  const pathname = url.pathname;
  const userIdMatch = pathname.match(/^\/users\/([^/]+)$/); // Endpoint do pobierania, aktualizacji i usuwania użytkownika. matchuje ścieżkę /users/:id, gdzie :id to identyfikator użytkownika
  const userFundMatch = pathname.match(/^\/users\/([^/]+)\/fund$/); // Endpoint do zasilania konta użytkownika. matchuje ścieżkę /users/:id/fund, gdzie :id to identyfikator użytkownika
  const carIdMatch = pathname.match(/^\/cars\/([^/]+)$/);
  const carBuyMatch = pathname.match(/^\/cars\/([^/]+)\/buy$/);

  if (method === "GET" && pathname === "/sse") {
    setupSse(res, req);
    return true;
  }

  if (method === "POST" && pathname === "/register") {
    const body = await readJsonBody<RegisterRequest>(req);
    if (!body || !body.username || !body.password) {
      sendJson(res, 400, { error: "Username i password sa wymagane" });
      return true;
    }

    const users = await getUsers();
    if (users.some((entry) => entry.username === body.username)) {
      sendJson(res, 409, { error: "Uzytkownik o takim username juz istnieje" });
      return true;
    }

    const newUser: User = {
      id: createId("user"),
      username: body.username,
      password: body.password,
      role: "user",
      balance: 0,
    };

    users.push(newUser);
    await saveUsers(users);
    sendJson(res, 201, toSafeUser(newUser));
    return true;
  }

  if (method === "POST" && pathname === "/login") {
    const body = await readJsonBody<LoginRequest>(req);
    if (!body || !body.username || !body.password) {
      sendJson(res, 400, { error: "Username i password sa wymagane" });
      return true;
    }

    const users = await getUsers();
    const user = users.find(
      (entry) =>
        entry.username === body.username && entry.password === body.password,
    );

    if (!user) {
      sendJson(res, 401, { error: "Niepoprawne dane logowania" });
      return true;
    }

    setAuthCookie(res, generateToken(user.id));
    sendJson(res, 200, toSafeUser(user));
    return true;
  }

  if (method === "POST" && pathname === "/logout") {
    clearAuthCookie(res);
    sendJson(res, 200, { status: "logged_out" });
    return true;
  }

  if (method === "GET" && pathname === "/users") {
    const currentUser = await getCurrentUser(req);
    // brak mozliwosci wejscia przez przegladarke na /users jesli nie jestesmy zalogowani
    if (!currentUser) {
      sendJson(res, 401, { error: "Brak autoryzacji" });
      return true;
    }

    if (currentUser.role === "admin") {
      const users = await getUsers();
      sendJson(res, 200, users.map(toSafeUser));
      return true;
    }

    sendJson(res, 200, toSafeUser(currentUser));
    return true;
  }

  if (method === "GET" && userIdMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const targetUserId = userIdMatch[1];
    //targetUserId to identyfikator użytkownika, którego dane chcemy pobrać. Jest on wyodrębniany z dopasowania wyrażenia regularnego do ścieżki żądania (userIdMatch[1]).
    // userIdMatch[1] zawiera część ścieżki po "/users/", czyli identyfikator użytkownika, którego dane chcemy pobrać. Na przykład, jeśli żądanie jest skierowane do "/users/123", to userIdMatch[1] będzie równe "123".

    if (currentUser.role !== "admin" && currentUser.id !== targetUserId) {
      sendJson(res, 403, { error: "Brak uprawnien" });
      return true;
    }

    const users = await getUsers();
    const user = users.find((entry) => entry.id === targetUserId);
    if (!user) {
      sendJson(res, 404, { error: "Uzytkownik nie istnieje" });
      return true;
    }

    sendJson(res, 200, toSafeUser(user));
    return true;
  }

  if (method === "POST" && pathname === "/users") {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    if (currentUser.role !== "admin") {
      sendJson(res, 403, {
        error: "Tylko admin moze tworzyc uzytkownikow tym endpointem",
      });
      return true;
    }

    const body = await readJsonBody<CreateUserRequest>(req);
    if (!body || !body.username || !body.password) {
      sendJson(res, 400, { error: "Username i password sa wymagane" });
      return true;
    }

    const users = await getUsers();
    if (users.some((entry) => entry.username === body.username)) {
      sendJson(res, 409, { error: "Uzytkownik o takim username juz istnieje" });
      return true;
    }

    const newUser: User = {
      id: createId("user"),
      username: body.username,
      password: body.password,
      role: body.role ?? "user",
      balance: body.balance ?? 0,
    };

    users.push(newUser);
    await saveUsers(users);
    sendJson(res, 201, toSafeUser(newUser));
    return true;
  }

  if ((method === "PUT" || method === "PATCH") && userIdMatch) {
    //
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const targetUserId = userIdMatch[1];
    if (currentUser.role !== "admin" && currentUser.id !== targetUserId) {
      sendJson(res, 403, { error: "Brak uprawnien" });
      return true;
    }

    const body = await readJsonBody<UpdateUserRequest>(req);
    if (!body) {
      sendJson(res, 400, { error: "Niepoprawne dane" });
      return true;
    }

    const users = await getUsers();
    const userIndex = users.findIndex((entry) => entry.id === targetUserId);
    if (userIndex === -1) {
      sendJson(res, 404, { error: "Uzytkownik nie istnieje" });
      return true;
    }

    const existingUser = users[userIndex];
    users[userIndex] = {
      ...existingUser,
      username: body.username ?? existingUser.username,
      password: body.password ?? existingUser.password,
      role:
        currentUser.role === "admin"
          ? (body.role ?? existingUser.role)
          : existingUser.role,
      balance:
        currentUser.role === "admin"
          ? (body.balance ?? existingUser.balance)
          : existingUser.balance,
    };

    await saveUsers(users);
    sendJson(res, 200, toSafeUser(users[userIndex]));
    return true;
  }

  if (method === "DELETE" && userIdMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const targetUserId = userIdMatch[1];
    if (currentUser.role !== "admin" && currentUser.id !== targetUserId) {
      sendJson(res, 403, { error: "Brak uprawnien" });
      return true;
    }

    const users = await getUsers();
    const nextUsers = users.filter((entry) => entry.id !== targetUserId);
    if (nextUsers.length === users.length) {
      sendJson(res, 404, { error: "Uzytkownik nie istnieje" });
      return true;
    }

    await saveUsers(nextUsers);
    if (currentUser.id === targetUserId) {
      clearAuthCookie(res);
    }
    sendJson(res, 200, { status: "deleted" });
    return true;
  }

  if (method === "POST" && userFundMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    if (currentUser.role !== "admin") {
      sendJson(res, 403, { error: "Tylko admin moze zasilac konta" });
      return true;
    }

    const body = await readJsonBody<{ amount?: number }>(req);
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      sendJson(res, 400, { error: "Kwota musi byc dodatnia liczba" });
      return true;
    }

    const users = await getUsers();
    const user = users.find((entry) => entry.id === userFundMatch[1]);
    if (!user) {
      sendJson(res, 404, { error: "Uzytkownik nie istnieje" });
      return true;
    }

    user.balance += amount;
    await saveUsers(users);
    sendJson(res, 200, toSafeUser(user));
    return true;
  }
  // w tym get dodawane jest do obiektu samochodu pole ownerName, które zawiera nazwę właściciela samochodu. W tym celu pobierana jest lista użytkowników, a następnie dla każdego samochodu wyszukiwany jest jego właściciel na podstawie ownerId. Jeśli właściciel zostanie znaleziony, jego nazwa (username) jest przypisywana do pola ownerName, w przeciwnym razie przypisywana jest wartość null.
  // mozna to wykorzystac w frontendzie do wyswietlania nazwy wlasciciela samochodu zamiast samego ownerId, co jest bardziej czytelne dla uzytkownika.
  if (method === "GET" && pathname === "/cars") {
    const cars = await getCars();
    const users = await getUsers();

    const carsWithOwnerName = cars.map((car) => {
      const owner = users.find((user) => user.id === car.ownerId);

      return {
        ...car,
        ownerName: owner ? owner.username : null,
      };
    });

    sendJson(res, 200, carsWithOwnerName);
    return true;
  }

  if (method === "GET" && carIdMatch) {
    const cars = await getCars();
    const car = cars.find((entry) => entry.id === carIdMatch[1]);
    if (!car) {
      sendJson(res, 404, { error: "Samochod nie istnieje" });
      return true;
    }

    sendJson(res, 200, car);
    return true;
  }

  if (method === "POST" && pathname === "/cars") {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const body = await readJsonBody<CreateCarRequest>(req);
    if (!body || !body.model || typeof body.price !== "number") {
      sendJson(res, 400, { error: "Model i price sa wymagane" });
      return true;
    }

    const cars = await getCars();
    const newCar: Car = {
      id: createId("car"),
      model: body.model,
      price: body.price,
      ownerId:
        currentUser.role === "admin" ? (body.ownerId ?? null) : currentUser.id,
    };

    cars.push(newCar);
    await saveCars(cars);
    sendJson(res, 201, newCar);
    return true;
  }

  if ((method === "PUT" || method === "PATCH") && carIdMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const body = await readJsonBody<UpdateCarRequest>(req);
    if (!body) {
      sendJson(res, 400, { error: "Niepoprawne dane" });
      return true;
    }

    const cars = await getCars();
    const car = cars.find((entry) => entry.id === carIdMatch[1]);
    if (!car) {
      sendJson(res, 404, { error: "Samochod nie istnieje" });
      return true;
    }

    if (currentUser.role !== "admin" && car.ownerId !== currentUser.id) {
      sendJson(res, 403, { error: "Brak uprawnien" });
      return true;
    }

    car.model = body.model ?? car.model;
    car.price = body.price ?? car.price;
    if (currentUser.role === "admin" && body.ownerId !== undefined) {
      car.ownerId = body.ownerId;
    }

    await saveCars(cars);
    sendJson(res, 200, car);
    return true;
  }

  if (method === "DELETE" && carIdMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const cars = await getCars();
    const car = cars.find((entry) => entry.id === carIdMatch[1]);
    if (!car) {
      sendJson(res, 404, { error: "Samochod nie istnieje" });
      return true;
    }

    if (currentUser.role !== "admin" && car.ownerId !== currentUser.id) {
      sendJson(res, 403, { error: "Brak uprawnien" });
      return true;
    }

    await saveCars(cars.filter((entry) => entry.id !== car.id));
    sendJson(res, 200, { status: "deleted" });
    return true;
  }

  if (method === "POST" && carBuyMatch) {
    const currentUser = await requireAuth(req, res);
    if (!currentUser) {
      return true;
    }

    const cars = await getCars();
    const car = cars.find((entry) => entry.id === carBuyMatch[1]);
    if (!car) {
      sendJson(res, 404, { error: "Samochod nie istnieje" });
      return true;
    }

    if (car.ownerId === currentUser.id) {
      sendJson(res, 409, { error: "Nie mozesz kupic swojego samochodu" });
      return true;
    }

    const users = await getUsers();
    const buyer = users.find((entry) => entry.id === currentUser.id);
    if (!buyer) {
      sendJson(res, 401, { error: "Brak autoryzacji" });
      return true;
    }

    if (buyer.balance < car.price) {
      sendJson(res, 409, { error: "Niewystarczajace saldo" });
      return true;
    }

    const previousOwner = car.ownerId
      ? (users.find((entry) => entry.id === car.ownerId) ?? null)
      : null;

    buyer.balance -= car.price;
    if (previousOwner) {
      previousOwner.balance += car.price;
    }
    car.ownerId = buyer.id;

    await saveUsers(users);
    await saveCars(cars);
    broadcastSse({ event: "car_bought", carId: car.id, buyerId: buyer.id });
    sendJson(res, 200, car);
    return true;
  }

  return false;
}

async function getCurrentUser(req: IncomingMessage): Promise<User | null> {
  const cookies = parseCookies(req);
  const token = cookies[getAuthCookieName()];
  if (!token) {
    return null;
  }

  const userId = getUserIdFromToken(token);
  if (!userId) {
    return null;
  }

  const users = await getUsers();
  return users.find((entry) => entry.id === userId) ?? null;
}

async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<User | null> {
  const currentUser = await getCurrentUser(req);
  if (!currentUser) {
    sendJson(res, 401, { error: "Brak autoryzacji" });
    return null;
  }

  return currentUser;
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T | null> {
  let body = "";

  for await (const chunk of req) {
    body += chunk;
  }

  if (!body) {
    return {} as T;
  }

  try {
    return JSON.parse(body) as T; // zamienia string JSON na obiekt JavaScript typu T
    //  '{"username":"jan","password":"tajne"}'
    // → { username: "jan", password: "tajne" }
  } catch {
    return null;
  }
}

function sendJson(
  res: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    balance: user.balance,
  };
}
// dodawanie generawania id do samochodów i użytkowników
function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function setupSse(res: ServerResponse, req: IncomingMessage): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");
  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
}

function broadcastSse(payload: Record<string, unknown>): void {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(message);
  }
}
