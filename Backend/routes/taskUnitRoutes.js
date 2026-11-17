
const express = require("express");
const router = express.Router();

const taskUnitController = require("../controllers/taskUnitController");

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

const {
    validateCreateTaskUnit,
    validateUpdateTaskUnit,
    validateTaskUnitId,
    handleTaskUnitValidationErrors
} = require("../middleware/taskUnitValidation");


/**
 * @openapi
 * /task-units:
 *   post:
 *     tags:
 *       - Task Units
 *     summary: Create a task unit
 *     description: Creates a measurement unit for the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - abbreviation
 *             properties:
 *               name:
 *                 type: string
 *                 example: Pieces
 *               abbreviation:
 *                 type: string
 *                 example: pcs
 *               description:
 *                 type: string
 *                 example: Individual pieces
 *     responses:
 *       "201":
 *         description: Task unit created successfully.
 *       "400":
 *         description: Validation failed.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "409":
 *         description: Unit name or abbreviation already exists.
 *       "500":
 *         description: Internal server error.
 */
router.post(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateCreateTaskUnit,
    handleTaskUnitValidationErrors,
    taskUnitController.createTaskUnit
);


/**
 * @openapi
 * /task-units:
 *   get:
 *     tags:
 *       - Task Units
 *     summary: Get all task units
 *     description: Returns measurement units belonging to the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Task units fetched successfully.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "500":
 *         description: Internal server error.
 */
router.get(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    taskUnitController.getTaskUnits
);


/**
 * @openapi
 * /task-units/{id}:
 *   patch:
 *     tags:
 *       - Task Units
 *     summary: Update a task unit
 *     description: Updates a measurement unit belonging to the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               abbreviation:
 *                 type: string
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       "200":
 *         description: Task unit updated successfully.
 *       "400":
 *         description: Validation failed.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "404":
 *         description: Task unit not found.
 *       "409":
 *         description: Unit name or abbreviation already exists.
 *       "500":
 *         description: Internal server error.
 */
router.patch(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateUpdateTaskUnit,
    handleTaskUnitValidationErrors,
    taskUnitController.updateTaskUnit
);


/**
 * @openapi
 * /task-units/{id}:
 *   delete:
 *     tags:
 *       - Task Units
 *     summary: Delete a task unit
 *     description: Permanently deletes a unit if it is not being used by any task in the organization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Task unit deleted successfully.
 *       "400":
 *         description: Invalid unit ID.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "404":
 *         description: Task unit not found.
 *       "409":
 *         description: Unit is currently being used by tasks.
 *       "500":
 *         description: Internal server error.
 */
router.delete(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskUnitId,
    handleTaskUnitValidationErrors,
    taskUnitController.deleteTaskUnit
);


module.exports = router;
