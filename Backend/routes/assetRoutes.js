const express = require("express");
const router = express.Router();

const assetController = require("../controllers/assetController");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");
const upload = require("../middleware/assetImageUploadMiddleware");
const fileUpload = require("../middleware/fileUploadMiddleware");

const handleUpload = (parser) => (req, res, next) => {
    parser(req, res, (error) => {
        if (!error) return next();

        return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({
            success: false,
            message: error.message
        });
    });
};

const uploadImage = handleUpload(upload.single("image"));
const uploadDocument = handleUpload(fileUpload.single("file"));

/**
 * @openapi
 * /assets:
 *   post:
 *     tags: [Assets]
 *     summary: Upload a project image asset
 *     description: Uploads a JPG, PNG, or WEBP image (up to 10 MB) to private S3 storage and records it for the project.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image, projectId]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               projectId:
 *                 type: string
 *               taskId:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: JSON array of tag strings, for example ["site","foundation"].
 *     responses:
 *       "201":
 *         description: Asset uploaded; response includes a temporary signed image URL.
 *       "400":
 *         description: Invalid project, tags, or image.
 *       "403":
 *         description: User is not assigned to the project or task.
 *       "404":
 *         description: Project or task not found.
 *       "500":
 *         description: Upload failed.
 */
router.post(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    uploadImage,
    assetController.uploadAsset
);

/**
 * @openapi
 * /assets/files:
 *   post:
 *     tags: [Assets]
 *     summary: Upload a project document
 *     description: Uploads PDF, XLSX, DOCX, TXT or MD files to private S3 storage. Maximum file size is 10 MB.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, projectId]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               projectId:
 *                 type: string
 *               taskId:
 *                 type: string
 *               tags:
 *                 type: string
 *                 description: JSON array of tag strings.
 *     responses:
 *       "201":
 *         description: File uploaded; response includes a temporary signed file URL, type, and size in MB.
 *       "400":
 *         description: Invalid project, tags, or file.
 *       "403":
 *         description: User is not assigned to the project or task.
 *       "404":
 *         description: Project or task not found.
 */
router.post(
    "/files",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    uploadDocument,
    assetController.uploadFileAsset
);

/**
 * @openapi
 * /assets:
 *   get:
 *     tags: [Assets]
 *     summary: List assets across accessible projects
 *     description: Supports project/task filtering, search, pagination, and filtering for the Images or Files tab.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Optional project filter. Omit to list assets across all accessible projects.
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *           enum: [image, file]
 *         description: Optional asset type filter for the Images and Files tabs.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search original filenames and asset tags.
 *     responses:
 *       "200":
 *         description: Paginated assets with temporary signed URLs.
 *       "403":
 *         description: User is not assigned to the project or task.
 *       "404":
 *         description: Project or task not found.
 */
router.get(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    assetController.listAssets
);

/**
 * @openapi
 * /assets/{assetId}:
 *   delete:
 *     tags: [Assets]
 *     summary: Delete an image asset
 *     description: The project Founder or the uploading Site Engineer may delete an asset.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Asset deleted successfully.
 *       "403":
 *         description: User is not authorized to delete this asset.
 *       "404":
 *         description: Asset not found.
 *       "502":
 *         description: Could not remove the image from S3.
 */
router.delete(
    "/:assetId",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    assetController.deleteAsset
);

module.exports = router;
