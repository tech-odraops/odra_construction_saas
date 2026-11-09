
const {
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const path = require("path");

const { s3Client, bucketName } = require("../utils/awsS3");

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

// Upload an image to S3
const uploadImage = async ({ file, folder }) => {
    if (!file || !Buffer.isBuffer(file.buffer)) {
        throw new Error("A valid image file is required");
    }

    if (!folder) {
        throw new Error("Upload folder is required");
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new Error("Only JPG, PNG and WEBP images are allowed");
    }

    if (file.size > MAX_FILE_SIZE) {
        throw new Error("Image size cannot exceed 5 MB");
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
    deleteImage,
    getImageUrl
};
