
const express = require("express");
const router = express.Router();

const taskCategoryController = require("../controllers/taskCategoryController");

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

const {
    validateCreateTaskCategory,
    validateUpdateTaskCategory,
    validateTaskCategoryId,
    handleTaskCategoryValidationErrors
} = require("../middleware/taskCategoryValidation");


/**
 * @openapi
 * /task-categories:
 *   post:
 *     tags:
 *       - Task Categories
 *     summary: Create a task category
 *     description: Creates a category for the authenticated user's organization. Available to Founders and Site Engineers.
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: Civil
 *               description:
 *                 type: string
 *                 example: Civil construction work
 *               icon:
 *                 type: string
 *                 example: building
 *     responses:
 *       "201":
 *         description: Category created successfully.
 *       "400":
 *         description: Validation failed.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "409":
 *         description: Category already exists.
 *       "500":
 *         description: Internal server error.
 */
router.post(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateCreateTaskCategory,
    handleTaskCategoryValidationErrors,
    taskCategoryController.createTaskCategory
);


/**
 * @openapi
 * /task-categories:
 *   get:
 *     tags:
 *       - Task Categories
 *     summary: Get all task categories
 *     description: Returns categories belonging to the authenticated user's organization.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: Categories fetched successfully.
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
    taskCategoryController.getTaskCategories
);


/**
 * @openapi
 * /task-categories/{id}:
 *   patch:
 *     tags:
 *       - Task Categories
 *     summary: Update a task category
 *     description: Updates a category belonging to the authenticated user's organization.
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
 *               description:
 *                 type: string
 *               icon:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       "200":
 *         description: Category updated successfully.
 *       "400":
 *         description: Validation failed.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "404":
 *         description: Category not found.
 *       "409":
 *         description: Category name already exists.
 *       "500":
 *         description: Internal server error.
 */
router.patch(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateUpdateTaskCategory,
    handleTaskCategoryValidationErrors,
    taskCategoryController.updateTaskCategory
);


/**
 * @openapi
 * /task-categories/{id}:
 *   delete:
 *     tags:
 *       - Task Categories
 *     summary: Delete a task category
 *     description: Permanently deletes a category if it is not being used by any task in the organization.
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
 *         description: Category deleted successfully.
 *       "400":
 *         description: Invalid category ID.
 *       "401":
 *         description: Authentication required.
 *       "403":
 *         description: Insufficient permissions.
 *       "404":
 *         description: Category not found.
 *       "409":
 *         description: Category is currently being used by tasks.
 *       "500":
 *         description: Internal server error.
 */
router.delete(
    "/:id",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    validateTaskCategoryId,
    handleTaskCategoryValidationErrors,
    taskCategoryController.deleteTaskCategory
);


module.exports = router;
