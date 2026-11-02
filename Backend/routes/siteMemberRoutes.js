
const express = require("express");
const router = express.Router();

const siteMemberController = require("../controllers/siteMemberController");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

/**
 * @openapi
 * /site-members:
 *   get:
 *     tags:
 *       - Site Members
 *     summary: Search active organization members
 *     description: >
 *       Available to active Founders and Site Engineers.
 *       Returns active Site Engineers and Site Supervisors belonging
 *       to the requester's organization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *         description: Search by member name or email.
 *     responses:
 *       "200":
 *         description: Matching active organization members.
 *       "400":
 *         description: Search text exceeds the maximum length.
 *       "401":
 *         description: Invalid authentication context.
 *       "403":
 *         description: User is not authorized to search members.
 *       "500":
 *         description: Unable to search site members.
 */
router.get(
    "/",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    siteMemberController.searchSiteMembers
);

/**
 * @openapi
 * /site-members/invite:
 *   post:
 *     tags:
 *       - Site Members
 *     summary: Invite a Site Engineer or Site Supervisor
 *     description: >
 *       Available to active Founders and Site Engineers.
 *       The invitation and new member account are associated with
 *       the requester's organization. The invited member must activate
 *       their account before they can be assigned to a project.
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
 *               - email
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum:
 *                   - Site Engineer
 *                   - Site Supervisor
 *     responses:
 *       "201":
 *         description: Invitation created and email sent.
 *       "400":
 *         description: Invalid invitation details.
 *       "401":
 *         description: Invalid authentication context.
 *       "403":
 *         description: User is not authorized to invite members.
 *       "409":
 *         description: Account or invitation already exists.
 *       "502":
 *         description: Invitation email delivery failed.
 *       "500":
 *         description: Invitation service error.
 */
router.post(
    "/invite",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    siteMemberController.inviteSiteMember
);

/**
 * @openapi
 * /site-members/projects/{projectId}/assign:
 *   post:
 *     tags:
 *       - Site Members
 *     summary: Assign a Site Engineer to a project
 *     description: >
 *       Available to the Founder and Site Engineer.
 *       A Founder can assign Site Engineers to projects in their organization.
 *       A Site Engineer can assign another Site Engineer only if they are
 *       already assigned to that project. The selected member must be an
 *       active Site Engineer in the same organization.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the project.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID of the Site Engineer to assign.
 *     responses:
 *       "200":
 *         description: Site Engineer assigned successfully.
 *       "400":
 *         description: Invalid member ID or member is not eligible.
 *       "403":
 *         description: Requester is not authorized to assign members.
 *       "404":
 *         description: Project not found in the organization.
 *       "409":
 *         description: Site Engineer is already assigned.
 *       "500":
 *         description: Could not assign Site Engineer.
 */
router.post(
    "/projects/:projectId/assign",
    authen,
    validateRoles(["Founder", "Site Engineer"]),
    siteMemberController.assignSiteMember
);
module.exports = router;
