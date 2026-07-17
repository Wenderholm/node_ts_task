const AUTH_COOKIE_NAME = "auth_token";
export function generateToken(userId) {
    return Buffer.from(userId, "utf8").toString("base64url");
}
export function getUserIdFromToken(token) {
    try {
        const userId = Buffer.from(token, "base64url").toString("utf8");
        return userId || null;
    }
    catch {
        return null;
    }
}
export function setAuthCookie(res, token) {
    res.setHeader("Set-Cookie", `${AUTH_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=86400; SameSite=Lax`);
}
export function clearAuthCookie(res) {
    res.setHeader("Set-Cookie", `${AUTH_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}
export function parseCookies(req) {
    const cookieHeader = req.headers.cookie;
    const cookies = {};
    if (!cookieHeader) {
        return cookies;
    }
    const cookiePairs = cookieHeader.split("; ");
    for (const pair of cookiePairs) {
        const separatorIndex = pair.indexOf("=");
        if (separatorIndex === -1) {
            continue;
        }
        const key = pair.slice(0, separatorIndex);
        const value = pair.slice(separatorIndex + 1);
        cookies[key] = value;
    }
    return cookies;
}
export function getAuthCookieName() {
    return AUTH_COOKIE_NAME;
}
