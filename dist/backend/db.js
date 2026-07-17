// DB INTERACTION
import { promises as fs } from "fs";
import path from "path";
const dbDir = path.join(process.cwd(), "db");
const usersFilePath = path.join(dbDir, "users.json");
const carsFilePath = path.join(dbDir, "cars.json");
export async function getUsers() {
    return readJsonFile(usersFilePath, []);
}
export async function saveUsers(users) {
    await writeJsonFile(usersFilePath, users);
}
export async function getCars() {
    return readJsonFile(carsFilePath, []);
}
export async function saveCars(cars) {
    await writeJsonFile(carsFilePath, cars);
}
async function readJsonFile(filePath, fallback) {
    try {
        const fileContent = await fs.readFile(filePath, "utf-8");
        return JSON.parse(fileContent);
    }
    catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
            return fallback;
        }
        throw error;
    }
}
async function writeJsonFile(filePath, data) {
    const json = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, json, "utf-8");
}
function isNodeError(error) {
    return typeof error === "object" && error !== null && "code" in error;
}
