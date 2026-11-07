
const express = require("express");
const router = express.Router();

const profileController = require("../controllers/profileController");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");
const upload = require("../middleware/uploadMiddleware");

const {
    validatePersonalProfile,
    validateOrganizationProfile,
    handleValidationErrors
} = require("../middleware/profileValidation");

/**
 * @openapi
 * /profile/me:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get authenticated user's profile
 *     description: Returns the personal profile of the authenticated Founder or Site Engineer.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: User profile fetched successfully.
 *       "401":
 *         description: Authentication required or token invalid.
 *       "403":
 *         description: User is not authorized.
 *       "404":
 *         description: User profile not found.
 *       "500":
 *         description: Internal server error.
 */
router.get(
    "/me",
    authen,
    validateRoles(["Site Engineer"]),
    profileController.getMyProfile
);


/**
 * @openapi
 * /profile/me:
 *   patch:
 *     tags:
 *       - Profile
 *     summary: Update Site Engineer personal profile
 *     description: Updates the authenticated Site Engineer's name, email, phone number and profile picture.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "200":
 *         description: Profile updated successfully.
 *       "400":
 *         description: Invalid input or image file.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: User is not authorized.
 *       "409":
 *         description: Email already exists.
 *       "500":
 *         description: Internal server error.
 */
router.patch(
    "/me",
    authen,
    validateRoles(["Site Engineer"]),
    upload.single("profilePicture"),
    validatePersonalProfile,
    handleValidationErrors,
    profileController.updateMyProfile
);


/**
 * @openapi
 * /profile/organization:
 *   get:
 *     tags:
 *       - Profile
 *     summary: Get organization profile
 *     description: Returns the organization name and logo for its authenticated Founder.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Organization profile fetched successfully.
 *       "401":
 *         description: Authentication required or token invalid.
 *       "403":
 *         description: Only the organization's Founder can access this endpoint.
 *       "404":
 *         description: Organization profile not found.
 *       "500":
 *         description: Internal server error.
 */
router.get(
    "/organization",
    authen,
    validateRoles("Founder"),
    profileController.getOrganizationProfile
);

/**
 * @openapi
 * /profile/organization:
 *   patch:
 *     tags:
 *       - Profile
 *     summary: Update organization profile
 *     description: Allows the authenticated Founder to update the organization name and logo.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               logo:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "200":
 *         description: Organization profile updated successfully.
 *       "400":
 *         description: Invalid input or image file.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Only the organization Founder can update this profile.
 *       "404":
 *         description: Organization not found.
 *       "500":
 *         description: Internal server error.
 */
router.patch(
    "/organization",
    authen,
    validateRoles(["Founder"]),
    upload.single("logo"),
    validateOrganizationProfile,
    handleValidationErrors,
    profileController.updateOrganizationProfile
);

module.exports = router;
