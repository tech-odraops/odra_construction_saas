const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const {authen} = require("../middleware/tokenValidatorsMiddleware");
const {validateRoles} = require("../middleware/roles");



// inventory summary
router.get(
  "/summary/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventorySummary
);

// Get inventory usage history
router.get(
  "/history/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventoryUsageHistory
);

// Log inventory usage (Site Engineer)
router.post(
  "/usage",
  authen,
  validateRoles(["Site Engineer"]),
  inventoryController.logInventoryUsage
);

// Get inventory purchase history
router.get(
  "/purchase-history/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventoryPurchaseHistory
);

// Add material to project
router.post(
  "/:projectId",
  authen,
  validateRoles(["Founder","Site Engineer"]),
  inventoryController.addInventoryItem
);

// View project inventory
router.get(
  "/:projectId",
  authen,
  validateRoles(["Founder","Site Engineer"]),
  inventoryController.getProjectInventory
);

module.exports = router;
