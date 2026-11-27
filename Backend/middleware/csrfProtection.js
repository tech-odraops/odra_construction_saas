const { isAllowedOrigin } = require("../utils/allowedOrigins");
const { AUTH_COOKIE_NAME } = require("../utils/authCookie");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const getRequestOrigin = (req) => {
    if (req.headers.origin) return req.headers.origin;

    const referer = req.headers.referer;
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
};

const isSameHostOrigin = (origin, req) => {
    try {
        return new URL(origin).host === req.get("host");
    } catch {
        return false;
    }
};

/*
 * CSRF protection for cookie-based authentication.
 *
 * The auth cookie is SameSite=None in production (frontend and API are
 * cross-site), so the browser attaches it to cross-site requests. CORS stops an
 * attacker from reading responses, but not from sending a request (for example a
 * form POST or multipart upload). This middleware rejects state-changing
 * requests unless they come from an allowed frontend origin.
 *
 * - Safe methods (GET/HEAD/OPTIONS) pass: they must not change state.
 * - Origin (or Referer) present: it must be an allowed frontend origin or the
 *   API's own host (Swagger UI).
 * - No Origin/Referer: allowed only when no auth cookie is sent (non-browser
 *   clients such as curl, server-to-server calls), because such a request cannot
 *   act on a browser session.
 */
const csrfProtection = (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = getRequestOrigin(req);

    if (origin) {
        if (isAllowedOrigin(origin) || isSameHostOrigin(origin, req)) return next();
    } else if (!req.cookies?.[AUTH_COOKIE_NAME]) {
        return next();
    }

    return res.status(403).json({
        success: false,
        error: "Request origin not allowed"
    });
};

module.exports = csrfProtection;
