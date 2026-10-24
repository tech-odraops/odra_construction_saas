const express = require('express');
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const workersController = require("../controllers/workersController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");

// Get workers for a project (used by attendance page)
/**
 * @openapi
 * /attendance/workers/{projectId}:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: List assigned workers for attendance entry
 *     description: Site engineer only.
 *     responses:
 *       "200":
 *         description: Workers assigned to the project.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 workers:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Worker"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
    '/workers/:projectId',
    authen,
    validateRoles("Site Engineer"),
    workersController.getProjectWorkers
);

// Mark attendance
/**
 * @openapi
 * /attendance/mark:
 *   post:
 *     tags:
 *       - Attendance
 *     summary: Mark or replace attendance for a project date
 *     description: Site engineer only. The record is upserted for the project/date.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - date
 *               - records
 *             properties:
 *               projectId:
 *                 type: string
 *               date:
 *                 type: string
 *                 description: Date key stored by the backend
 *                 for example 2026-10-17: null
 *               records:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - workerId
 *                     - status
 *                   properties:
 *                     workerId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum:
 *                         - absent
 *                         - present
 *     responses:
 *       "201":
 *         description: Attendance saved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 attendance:
 *                   $ref: "#/components/schemas/Attendance"
 *       "400":
 *         description: Project completed, worker not assigned to project, or worker is free.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "404":
 *         description: Project or worker not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    '/mark',
    authen,
    validateRoles("Site Engineer"),
    attendanceController.markAttendance
);

// Get attendance for a specific project and date
/**
 * @openapi
 * /attendance/{projectId}/{date}:
 *   get:
 *     tags:
 *       - Attendance
 *     summary: Get attendance for a project and date
 *     description: Site engineer or manager.
 *     responses:
 *       "200":
 *         description: Attendance document, or an empty records array if none exists for
 *           that date.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 attendance:
 *                   $ref: "#/components/schemas/Attendance"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
    '/:projectId/:date',
    authen,
    validateRoles(["Site Engineer", "Founder"]),
    attendanceController.getAttendance
);

module.exports = router;

