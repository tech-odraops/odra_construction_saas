
const {
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");
const sharp = require("sharp");

const { s3Client, bucketName } = require("../utils/awsS3");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const THUMBNAIL_SIZE = 128;
const THUMBNAIL_QUALITY = 75;

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const ALLOWED_FILE_TYPES = {
    ".pdf": ["application/pdf"],
    ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ".txt": ["text/plain"],
    ".md": ["text/markdown", "text/plain"]
};

// Upload an image to S3
const uploadImage = async ({ file, folder, maxFileSize = MAX_FILE_SIZE }) => {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        throw new Error("A valid image file is required");
    }

    if (!folder) {
        throw new Error("Upload folder is required");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error("Only JPG, PNG and WEBP images are allowed");
    }

    if (file.size > maxFileSize) {
        throw new Error(`Image size cannot exceed ${maxFileSize / (1024 * 1024)} MB`);
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const safeFolder = folder.replace(/^\/+|\/+$/g, "");

    const key = `${safeFolder}/${crypto.randomUUID()}${extension}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "max-age=31536000"
    });

    await s3Client.send(command);

    return {
        key
    };
};

const uploadFile = async ({ file, folder }) => {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        throw new Error("A valid file is required");
    }

    if (!folder) {
        throw new Error("Upload folder is required");
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];
    if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
        throw new Error("Only PDF, XLSX, DOCX, TXT and MD files are allowed");
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error("File size cannot exceed 10 MB");
    }

    const safeFolder = folder.replace(/^\/+|\/+$/g, "");
    const key = `${safeFolder}/${crypto.randomUUID()}${extension}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        CacheControl: "max-age=31536000"
    }));

    return { key };
};

const createThumbnailBuffer = (buffer) => sharp(buffer)
    .rotate()
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
    .webp({ quality: THUMBNAIL_QUALITY })
    .toBuffer();

const getThumbnailKey = (key) => `${key}.thumbnail.webp`;

const uploadThumbnail = async ({ key, buffer }) => {
    await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: "image/webp",
        CacheControl: "max-age=31536000"
    }));
};

const uploadImageWithThumbnail = async ({ file, folder, maxFileSize = MAX_FILE_SIZE }) => {
    const original = await uploadImage({ file, folder, maxFileSize });
    const thumbnailKey = getThumbnailKey(original.key);

    try {
        const thumbnailBuffer = await createThumbnailBuffer(file.buffer);
        await uploadThumbnail({ key: thumbnailKey, buffer: thumbnailBuffer });
        return { key: original.key, thumbnailKey };
    } catch (error) {
        for (const key of [original.key, thumbnailKey]) {
            try {
                await deleteImage(key);
            } catch (cleanupError) {
                console.error("Uploaded image variant cleanup failed:", cleanupError);
            }
        }
        throw error;
    }
};

const ensureImageThumbnail = async (key) => {
    if (!key) {
        throw new Error("S3 object key is required");
    }

    const response = await s3Client.send(new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    }));

    if (!response.Body) {
        throw new Error("S3 image object has no body");
    }

    const originalBuffer = Buffer.from(await response.Body.transformToByteArray());
    const thumbnailBuffer = await createThumbnailBuffer(originalBuffer);
    const thumbnailKey = getThumbnailKey(key);

    await uploadThumbnail({ key: thumbnailKey, buffer: thumbnailBuffer });
    return thumbnailKey;
};

// Delete an image from S3
const deleteImage = async (key) => {
    if (!key) {
        throw new Error("S3 object key is required");
    }

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
    });

    await s3Client.send(command);

    return { success: true };
};

// Generate a temporary URL for viewing a private image
const getImageUrl = async (key, expiresIn = 900) => {
    if (!key) {
        throw new Error("S3 object key is required");
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    });

    return await getSignedUrl(s3Client, command, {
        expiresIn
    });
};

module.exports = {
    uploadImage,
    uploadFile,
    uploadImageWithThumbnail,
    ensureImageThumbnail,
    deleteImage,
    getImageUrl
};
