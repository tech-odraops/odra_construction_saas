require("dotenv").config();

/*
 * HTTP-only JWT cookie configuration.
 *
 * Production (default): the frontend (Netlify / odraops.com) and the API
 * (onrender.com) are on different sites, so the cookie must be
 * `SameSite=None; Secure` to be sent on cross-site XHR/WebSocket requests.
 * CSRF is handled separately by middleware/csrfProtection.js.
 *
 * If the API is moved to a subdomain of the frontend (e.g. api.odraops.com),
 * set AUTH_COOKIE_SAMESITE=lax for stronger built-in CSRF protection.
 *
 * Local development (NODE_ENV=development): localhost:5173 -> localhost:8080 is
 * same-site, so `SameSite=Lax` without `Secure` works over plain HTTP.
 *
 * Env overrides:
 *   AUTH_COOKIE_NAME      cookie name (default "odra_auth")
 *   AUTH_COOKIE_SAMESITE  "lax" | "strict" | "none"
 *   AUTH_COOKIE_SECURE    "true" | "false" (forced to true when SameSite=None)
 *   AUTH_COOKIE_DOMAIN    optional cookie domain (leave unset for host-only)
 */

// Must stay in sync with the JWT expiry so the cookie and token expire together.
const AUTH_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "odra_auth";

const isDevelopment = process.env.NODE_ENV === "development";
const VALID_SAME_SITE = ["lax", "strict", "none"];

const configuredSameSite = (process.env.AUTH_COOKIE_SAMESITE || "").toLowerCase();
const sameSite = VALID_SAME_SITE.includes(configuredSameSite)
    ? configuredSameSite
    : (isDevelopment ? "lax" : "none");

const configuredSecure = process.env.AUTH_COOKIE_SECURE;
let secure = configuredSecure === undefined || configuredSecure === ""
    ? !isDevelopment
    : configuredSecure === "true";

// Browsers reject SameSite=None cookies that are not Secure.
if (sameSite === "none") secure = true;

const baseCookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: "/",
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {})
};

const setAuthCookie = (res, token) => {
    res.cookie(AUTH_COOKIE_NAME, token, {
        ...baseCookieOptions,
        maxAge: AUTH_TOKEN_TTL_SECONDS * 1000
    });
};

// clearCookie must use the same name/path/domain/sameSite/secure as setAuthCookie.
const clearAuthCookie = (res) => {
    res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);
};

// Reads the auth cookie from a raw Cookie header (used for Socket.IO handshakes,
// which do not go through cookie-parser).
const getAuthTokenFromCookieHeader = (cookieHeader) => {
    if (!cookieHeader || typeof cookieHeader !== "string") return null;

    for (const part of cookieHeader.split(";")) {
        const separatorIndex = part.indexOf("=");
        if (separatorIndex === -1) continue;

        const name = part.slice(0, separatorIndex).trim();
        if (name !== AUTH_COOKIE_NAME) continue;

        const value = part.slice(separatorIndex + 1).trim();
        try {
            return decodeURIComponent(value) || null;
        } catch {
            return null;
        }
    }

    return null;
};

module.exports = {
    AUTH_COOKIE_NAME,
    AUTH_TOKEN_TTL_SECONDS,
    setAuthCookie,
    clearAuthCookie,
    getAuthTokenFromCookieHeader
};
