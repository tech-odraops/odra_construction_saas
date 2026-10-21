const express = require('express');
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const workersController = require("../controllers/workersController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");

// Get workers for a project (used by attendance page)
router.get(
    '/workers/:projectId',
    authen,
    validateRoles("Site Engineer"),
    workersController.getProjectWorkers
);

// Mark attendance
router.post(
    '/mark',
    authen,
    validateRoles("Site Engineer"),
    attendanceController.markAttendance
);

// Get attendance for a specific project and date
router.get(
    '/:projectId/:date',
    authen,
    validateRoles(["Site Engineer", "Founder"]),
    attendanceController.getAttendance
);

module.exports = router;

