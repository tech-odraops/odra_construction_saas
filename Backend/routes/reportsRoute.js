const express = require('express');
const router = express.Router();
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");
const reportController = require("../controllers/reportControllers");
const upload = require("../middleware/audioUpload");

// create report by site engineer
router.post('/',authen,validateRoles('Site Engineer'),reportController.createReport);

router.post('/:reportId/review', authen,validateRoles('Founder'), reportController.reviewReport);

// ai summary
router.post('/:reportId/ai-summary',
    authen,
    validateRoles('Founder'),
    reportController.generateAISummary
);

// voiceToText
router.post(
    "/voice-to-text",
    authen,
    upload.single("audio"),
    reportController.voiceToTextTest
);

// get report by id
router.get('/:id',authen,validateRoles('Founder'),reportController.getReportById);

module.exports = router;
