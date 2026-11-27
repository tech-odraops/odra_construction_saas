const multer = require("multer");

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "audio/mpeg",
    "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel"
]);
module.exports = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, callback) => ALLOWED_MIME_TYPES.has(file.mimetype) ? callback(null, true) : callback(new Error("Choose a supported image, video, or document."), false),
    limits: { fileSize: 50 * 1024 * 1024 }
});
