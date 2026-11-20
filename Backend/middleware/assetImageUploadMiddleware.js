const multer = require("multer");

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return callback(
                new Error("Only JPG, PNG and WEBP images are allowed"),
                false
            );
        }
        return callback(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

module.exports = upload;
