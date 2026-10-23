const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventoryController");
const {authen} = require("../middleware/tokenValidatorsMiddleware");
const {validateRoles} = require("../middleware/roles");



// inventory summary
/**
 * @openapi
 * /inventory/summary/{projectId}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get inventory cost summary
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Purchase, usage, and remaining-stock values.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalPurchasedValue:
 *                   type: number
 *                 totalUsedCost:
 *                   type: number
 *                 remainingStockValue:
 *                   type: number
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
  "/summary/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventorySummary
);

// Get inventory usage history
/**
 * @openapi
 * /inventory/history/{projectId}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get inventory usage history
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Usage history with populated item and user data.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/InventoryUsage"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
  "/history/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventoryUsageHistory
);

// Log inventory usage (Site Engineer)
/**
 * @openapi
 * /inventory/usage:
 *   post:
 *     tags:
 *       - Inventory
 *     summary: Record inventory material usage
 *     description: Site engineer only.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - inventoryItemId
 *               - usedQty
 *               - date
 *             properties:
 *               projectId:
 *                 type: string
 *               inventoryItemId:
 *                 type: string
 *               usedQty:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *     responses:
 *       "201":
 *         description: Usage recorded and stock deducted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessMessage"
 *       "400":
 *         description: Required value missing, project completed, or quantity exceeds
 *           available stock.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "404":
 *         description: Project or inventory item not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.post(
  "/usage",
  authen,
  validateRoles(["Site Engineer"]),
  inventoryController.logInventoryUsage
);

// Get inventory purchase history
/**
 * @openapi
 * /inventory/purchase-history/{projectId}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get inventory purchase history
 *     description: Manager only.
 *     responses:
 *       "200":
 *         description: Purchase history with populated item and creator.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 history:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/InventoryPurchase"
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
  "/purchase-history/:projectId",
  authen,
  validateRoles(["Founder"]),
  inventoryController.getInventoryPurchaseHistory
);

// Add material to project
/**
 * @openapi
 * /inventory/{projectId}:
 *   post:
 *     tags:
 *       - Inventory
 *     summary: Add or replenish a project inventory item
 *     description: Manager or site engineer. A purchase record is created for each call.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - unit
 *               - quantity
 *               - purchaseDate
 *             properties:
 *               name:
 *                 type: string
 *               unit:
 *                 type: string
 *               quantity:
 *                 type: number
 *               pricePerUnit:
 *                 type: number
 *               supplierName:
 *                 type: string
 *               companyName:
 *                 type: string
 *               purchaseDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       "200":
 *         description: Inventory item added or replenished.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 item:
 *                   $ref: "#/components/schemas/InventoryItem"
 *       "400":
 *         description: Required field missing or project inventory locked.
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
router.post(
  "/:projectId",
  authen,
  validateRoles(["Founder","Site Engineer"]),
  inventoryController.addInventoryItem
);

// View project inventory
/**
 * @openapi
 * /inventory/{projectId}:
 *   get:
 *     tags:
 *       - Inventory
 *     summary: Get project inventory
 *     description: Manager or site engineer. Each item includes an isLowStock flag.
 *     responses:
 *       "200":
 *         description: Project inventory items.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 items:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: "#/components/schemas/InventoryItem"
 *                       - type: object
 *                         properties:
 *                           isLowStock:
 *                             type: boolean
 *       "500":
 *         $ref: "#/components/responses/InternalServerError"
 */
router.get(
  "/:projectId",
  authen,
  validateRoles(["Founder","Site Engineer"]),
  inventoryController.getProjectInventory
);

module.exports = router;
