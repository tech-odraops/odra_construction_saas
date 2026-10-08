const express = require("express");
const router = express.Router();

const { getAdminDashboard, getUserGrowth } = require("../controllers/adminDashboardController");

const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

router.get(
    "/dashboard",
    authen,
    validateRoles(["admin"]),
    getAdminDashboard
);

router.get(
    "/user-growth",
    authen,
    validateRoles(["admin"]),
    getUserGrowth
);

module.exports = router;
