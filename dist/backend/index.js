var _a;
import { promises as fs } from "fs";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { handleApiRequest } from "./routes.js";
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(process.cwd(), "frontend");
const server = createServer(async (req, res) => {
    var _a, _b;
    try {
        const url = new URL((_a = req.url) !== null && _a !== void 0 ? _a : "/", `http://${(_b = req.headers.host) !== null && _b !== void 0 ? _b : "localhost:3000"}`);
        if (req.method === "GET" && url.pathname === "/") {
            await sendStaticFile(res, path.join(frontendDir, "index.html"));
            return;
        }
        if (req.method === "GET" && url.pathname.startsWith("/static/")) {
            const relativeFilePath = url.pathname.replace("/static/", "");
            await sendStaticFile(res, path.join(frontendDir, relativeFilePath));
            return;
        }
        const handled = await handleApiRequest(req, res);
        if (handled) {
            return;
        }
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Not found" }));
    }
    catch (error) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({
            error: error instanceof Error ? error.message : "Internal server error",
        }));
    }
});
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
async function sendStaticFile(res, filePath) {
    try {
        const data = await fs.readFile(filePath);
        res.statusCode = 200;
        res.setHeader("Content-Type", getContentType(filePath));
        res.end(data);
    }
    catch {
        res.statusCode = 404;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ error: "Static file not found" }));
    }
}
function getContentType(filePath) {
    if (filePath.endsWith(".html")) {
        return "text/html; charset=utf-8";
    }
    if (filePath.endsWith(".css")) {
        return "text/css; charset=utf-8";
    }
    if (filePath.endsWith(".js")) {
        return "application/javascript; charset=utf-8";
    }
    return "application/octet-stream";
}
