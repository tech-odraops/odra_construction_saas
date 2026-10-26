const express = require("express");
const router = express.Router();

const { getAdminDashboard, getUserGrowth } = require("../controllers/adminDashboardController");

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

/**
 * @openapi
 * /admin/dashboard:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get admin dashboard totals
 *     description: Admin role only.
 *     responses:
 *       "200":
 *         description: Total user and organization counts.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalUsers:
 *                   type: integer
 *                 totalOrganizations:
 *                   type: integer
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
    "/dashboard",
    authen,
    validateRoles(["admin"]),
    getAdminDashboard
);

/**
 * @openapi
 * /admin/user-growth:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Get user growth grouped by month
 *     description: Admin role only. Months are Jan through Dec.
 *     responses:
 *       "200":
 *         description: User counts by calendar month.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       month:
 *                         type: string
 *                       users:
 *                         type: integer
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
    "/user-growth",
    authen,
    validateRoles(["admin"]),
    getUserGrowth
);

module.exports = router;
