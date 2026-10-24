const express = require('express');
const router = express.Router();
const workersController = require("../controllers/workersController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");


// Create worker (Contractor only)
/**
 * @openapi
 * /workers:
 *   post:
 *     tags:
 *       - Workers
 *     summary: Create a worker
 *     description: Manager only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               dailyWage:
 *                 type: number
 *               payoutType:
 *                 type: string
 *                 enum:
 *                   - daily
 *                   - monthly
 *                 default: daily
 *     responses:
 *       "201":
 *         description: Worker created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 worker:
 *                   $ref: "#/components/schemas/Worker"
 *       "400":
 *         description: Worker name is required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post('/', authen, validateRoles("Founder"), workersController.createWorker);

// Get workers for a project
/**
 * @openapi
 * /workers/{projectId}:
 *   get:
 *     tags:
 *       - Workers
 *     summary: List workers assigned to a project
 *     description: Manager or site engineer.
 *     responses:
 *       "200":
 *         description: Assigned workers.
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
router.get('/:projectId', authen, validateRoles(["Founder", "Site Engineer"]), workersController.getProjectWorkers);

// Get all workers
/**
 * @openapi
 * /workers:
 *   get:
 *     tags:
 *       - Workers
 *     summary: List workers created by the manager
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Workers and their populated current project, if assigned.
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
router.get('/', authen, validateRoles("Founder"), workersController.getAllWorkers);

// Assign worker to project
/**
 * @openapi
 * /workers/{workerId}/assign:
 *   post:
 *     tags:
 *       - Workers
 *     summary: Assign a worker to a project
 *     description: Manager only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *             properties:
 *               projectId:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Worker assigned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Project completed or worker is not free.
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
router.post('/:workerId/assign', authen, validateRoles("Founder"), workersController.assignWorkerToProject);

module.exports = router;
