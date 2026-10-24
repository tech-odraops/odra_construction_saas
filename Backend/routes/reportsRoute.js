const express = require('express');
const router = express.Router();
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");
const reportController = require("../controllers/reportControllers");
const upload = require("../middleware/audioUpload");

// create report by site engineer
/**
 * @openapi
 * /reports:
 *   post:
 *     tags:
 *       - Reports
 *     summary: Submit a daily project report
 *     description: Site engineer assigned to the project only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - workDone
 *             properties:
 *               projectId:
 *                 type: string
 *               workDone:
 *                 type: string
 *               issuesFound:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *     responses:
 *       "201":
 *         description: Report created.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 report:
 *                   $ref: "#/components/schemas/Report"
 *                 message:
 *                   type: string
 *                   example: Report Created Successfully
 *       "400":
 *         description: Project is completed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "403":
 *         description: Site engineer is not assigned to the project.
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
router.post('/',authen,validateRoles('Site Engineer'),reportController.createReport);

/**
 * @openapi
 * /reports/{reportId}/review:
 *   post:
 *     tags:
 *       - Reports
 *     summary: Review a report
 *     description: Manager only. contractorStatus is applied only when it is approved,
 *       declined, or pending.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contractorStatus:
 *                 type: string
 *                 enum:
 *                   - approved
 *                   - declined
 *                   - pending
 *               contractorComment:
 *                 type: string
 *     responses:
 *       "202":
 *         description: Review saved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "404":
 *         description: Report not found or reviewer is not authorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post('/:reportId/review', authen,validateRoles('Founder'), reportController.reviewReport);

// ai summary
/**
 * @openapi
 * /reports/{reportId}/ai-summary:
 *   post:
 *     tags:
 *       - Reports
 *     summary: Generate an AI summary for a report
 *     description: Manager only. Request body is not used.
 *     responses:
 *       "200":
 *         description: Summary generated and saved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 aiSummary:
 *                   type: object
 *                   properties:
 *                     workCompletedSummary:
 *                       type: string
 *                     issuesSummary:
 *                       type: string
 *                     overallStatus:
 *                       type: string
 *       "404":
 *         description: Report not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post('/:reportId/ai-summary',
    authen,
    validateRoles('Founder'),
    reportController.generateAISummary
);

// voiceToText
/**
 * @openapi
 * /reports/voice-to-text:
 *   post:
 *     tags:
 *       - Reports
 *     summary: Transcribe uploaded audio and structure a report draft
 *     description: Authenticated user. Upload a single audio file with the form field
 *       name audio.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       "200":
 *         description: Audio transcript and extracted report fields.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 transcript:
 *                   type: string
 *                 structuredData:
 *                   type: object
 *                   properties:
 *                     workDone:
 *                       type: string
 *                     issuesFound:
 *                       type: string
 *       "400":
 *         description: No audio uploaded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
    "/voice-to-text",
    authen,
    upload.single("audio"),
    reportController.voiceToTextTest
);

// get report by id
/**
 * @openapi
 * /reports/{id}:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get a report
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Report with populated project and site engineer.
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
 *                 report:
 *                   $ref: "#/components/schemas/Report"
 *       "404":
 *         description: Report not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get('/:id',authen,validateRoles('Founder'),reportController.getReportById);

module.exports = router;
