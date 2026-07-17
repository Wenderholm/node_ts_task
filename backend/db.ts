// DB INTERACTION
import { promises as fs } from "fs";

import path from "path";
import { Car, User } from "../shared/types.js";

const dbDir = path.join(process.cwd(), "db");
const usersFilePath = path.join(dbDir, "users.json");
const carsFilePath = path.join(dbDir, "cars.json");

export async function getUsers(): Promise<User[]> {
  return readJsonFile<User[]>(usersFilePath, []);
}

export async function saveUsers(users: User[]): Promise<void> {
  await writeJsonFile(usersFilePath, users);
}

export async function getCars(): Promise<Car[]> {
  return readJsonFile<Car[]>(carsFilePath, []);
}

export async function saveCars(cars: Car[]): Promise<void> {
  await writeJsonFile(carsFilePath, cars);
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const fileContent = await fs.readFile(filePath, "utf-8");
    return JSON.parse(fileContent) as T;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, "utf-8");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
