const multer = require("multer");

const ALLOWED_FILE_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown"
];

const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, callback) => {
        if (!ALLOWED_FILE_MIME_TYPES.includes(file.mimetype)) {
            return callback(
                new Error("Only PDF, XLSX, DOCX, TXT and MD files are allowed"),
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
