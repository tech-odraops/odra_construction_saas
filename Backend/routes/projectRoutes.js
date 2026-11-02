const express = require('express');
const router = express.Router();
const projectController = require("../controllers/projectController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");

// create Project
/**
 * @openapi
 * /projects:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Create a project and assign a site engineer
 *     description: Manager only. If no matching site engineer exists in the
 *       organization, one is created from the supplied engineer details.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - siteEngineerEmail
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               siteEngineerEmail:
 *                 type: string
 *                 format: email
 *               siteEngineerName:
 *                 type: string
 *     responses:
 *       "201":
 *         description: Project created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 newProject:
 *                   $ref: "#/components/schemas/Project"
 *                 contractorName:
 *                   type: string
 *       "403":
 *         description: Site engineer belongs to a different organization.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "404":
 *         description: Required fields missing or contractor not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post('/',authen,validateRoles("Founder"),projectController.createProject);

// get all project and search
/**
 * @openapi
 * /projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: List and search projects for the founder's organization
 *     description: Manager only. Supports filtering by search text, status, page, and limit.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: "bridge"
 *         description: Search by project title, description, or location.
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum:
 *             - Ongoing
 *             - Completed
 *             - all
 *           default: all
 *         description: Optional project status filter.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination.
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *           default: 10
 *         description: Number of projects per page.
 *     responses:
 *       "200":
 *         description: Project list or filtered search results.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Project"
 *                 message:
 *                   type: string
 *                 total:
 *                   type: integer
 *                   example: 12
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get('/',authen,validateRoles("Founder"),projectController.getProject);

// get all project for the siteEn
/**
 * @openapi
 * /projects/my-projects:
 *   get:
 *     tags:
 *       - Projects
 *     summary: List projects assigned to the site engineer
 *     description: Site engineer only.
 *     responses:
 *       "200":
 *         description: Assigned projects, or an empty list.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Project"
 *                 message:
 *                   type: string
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get('/my-projects',authen,validateRoles("Site Engineer"),projectController.getProjectSE);

// get dashboard summary for contractor
/**
 * @openapi
 * /projects/dashboard:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get organization project dashboard totals
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Project counts and up to five recent projects.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalProjects:
 *                   type: integer
 *                 ongoingProjects:
 *                   type: integer
 *                 completedProjects:
 *                   type: integer
 *                 recentProjects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum:
 *                           - Ongoing
 *                           - Completed
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get("/dashboard",authen, validateRoles("Founder"),projectController.getContractorDashboard);

// single project for contractor or Site Engineer
/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Get project details and reports
 *     description: Manager or site engineer.
 *     responses:
 *       "200":
 *         description: Project document populated with contractor, site engineer, and reports.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project:
 *                   $ref: "#/components/schemas/Project"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get('/:id',authen,validateRoles(["Founder","Site Engineer"]),projectController.getProjectById);

// complete project
/**
 * @openapi
 * /projects/{projectId}/complete:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Mark a project completed
 *     description: Manager only. Request body is not used.
 *     responses:
 *       "200":
 *         description: Project completed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Project is already completed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "403":
 *         description: Not authorized to complete this project.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post('/:projectId/complete',authen,validateRoles("Founder"),projectController.completeProject);

// get wage
/**
 * @openapi
 * /projects/{projectId}/wages:
 *   get:
 *     tags:
 *       - Projects
 *     summary: Calculate project worker wages
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Worker wages and project total.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     workers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           workerId:
 *                             type: string
 *                           name:
 *                             type: string
 *                           payoutType:
 *                             type: string
 *                             enum:
 *                               - daily
 *                               - monthly
 *                           totalWage:
 *                             type: number
 *                     totalProjectWage:
 *                       type: number
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get( "/:projectId/wages", authen,validateRoles(["Founder"]), projectController.getProjectWages);

// delete project 
/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     tags:
 *       - Projects
 *     summary: Delete a project and related records
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Project deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.delete("/:id", authen, validateRoles("Founder"), projectController.deleteProject);

// add miscellaneous item
/**
 * @openapi
 * /projects/{projectId}/miscellaneous:
 *   post:
 *     tags:
 *       - Projects
 *     summary: Add a miscellaneous project expense
 *     description: Site engineer only. totalCost and initial status are calculated/set
 *       by the backend.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemName
 *               - purchaseDate
 *               - unit
 *               - quantity
 *               - pricePerUnit
 *             properties:
 *               itemName:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *               unit:
 *                 type: string
 *               quantity:
 *                 type: number
 *               pricePerUnit:
 *                 type: number
 *     responses:
 *       "201":
 *         description: Expense added; data contains the project's miscellaneousItems array.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/MiscellaneousItem"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    "/:projectId/miscellaneous",
    authen,
    validateRoles("Site Engineer"),
    projectController.addMiscellaneousItem
);

// approve/reject miscellaneous item
/**
 * @openapi
 * /projects/{projectId}/miscellaneous/{itemId}/status:
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Approve or reject a miscellaneous expense
 *     description: Manager only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum:
 *                   - Approved
 *                   - Rejected
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Expense status updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: "#/components/schemas/MiscellaneousItem"
 *       "404":
 *         description: Project or item not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.patch(
    "/:projectId/miscellaneous/:itemId/status",
    authen,
    validateRoles("Founder"),
    projectController.updateMiscellaneousStatus
);

// patch request to update title
/**
 * @openapi
 * /projects/{projectId}/title:
 *   patch:
 *     tags:
 *       - Projects
 *     summary: Update project title
 *     description: Manager only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Project title updated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 project:
 *                   $ref: "#/components/schemas/Project"
 *       "400":
 *         description: Title is missing or blank.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "403":
 *         description: Not authorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "404":
 *         description: Project not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.patch(
    "/:projectId/title",
    authen,
    validateRoles("Founder"),
    projectController.updateProjectTitle
)

module.exports = router;
