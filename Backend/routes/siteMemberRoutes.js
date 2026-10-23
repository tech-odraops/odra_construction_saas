
const express = require("express");
const router = express.Router();

const siteMemberController = require("../controllers/siteMemberController");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

// Search active Site Engineers and Site Supervisors in the Founder's organization.
router.get(
    "/",
    authen,
    validateRoles(["Founder"]),
    siteMemberController.searchSiteMembers
);

// Invite a new Site Engineer or Site Supervisor.
router.post(
    "/invite",
    authen,
    validateRoles(["Founder"]),
    siteMemberController.inviteSiteMember
);

router.post(
  "/projects/:projectId/assign",
  authen,
  validateRoles(["Founder"]),
  siteMemberController.assignSiteMember
);

module.exports = router;
