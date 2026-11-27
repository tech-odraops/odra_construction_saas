require("dotenv").config();

// Frontend origins allowed to make credentialed (cookie) requests.
// Override with a comma-separated CORS_ALLOWED_ORIGINS env variable.
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
    : [
        "http://localhost:5173",
        "https://odraopssaass.netlify.app",
        "https://odraops.com",
        "https://www.odraops.com"
    ];

const isAllowedOrigin = (origin) => Boolean(origin) && allowedOrigins.includes(origin);

module.exports = { allowedOrigins, isAllowedOrigin };
