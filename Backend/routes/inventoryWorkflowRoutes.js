const express = require("express");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");
const controller = require("../controllers/inventoryWorkflowController");

const router = express.Router();
const requireInventoryRole = [authen, validateRoles(["Founder", "Site Engineer"])];

/**
 * @openapi
 * /inventory/materials:
 *   get:
 *     tags: [Inventory]
 *     summary: List organization materials
 *     responses:
 *       "200":
 *         description: Organization-scoped material catalog.
 *   post:
 *     tags: [Inventory]
 *     summary: Create a material catalog entry
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, category, unit]
 *             properties:
 *               name: { type: string }
 *               category: { type: string }
 *               unit: { type: string }
 *               specifications: { type: object, additionalProperties: true }
 *     responses:
 *       "201": { description: Material created. }
 *       "409": { description: Material name and unit already exist. }
 * /inventory/materials/{materialId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a material
 *     parameters:
 *       - name: materialId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Material details. }
 *   patch:
 *     tags: [Inventory]
 *     summary: Update or deactivate a material
 *     parameters:
 *       - name: materialId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/InventoryMaterial"
 *     responses:
 *       "200": { description: Material updated. }
 * /inventory/locations:
 *   get:
 *     tags: [Inventory]
 *     summary: List accessible project sites and warehouses
 *     parameters:
 *       - name: projectId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Accessible inventory locations. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a warehouse location
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               code: { type: string }
 *               address: { type: string }
 *     responses:
 *       "201": { description: Warehouse created. }
 * /inventory/locations/{locationId}/inventory:
 *   get:
 *     tags: [Inventory]
 *     summary: Get stock and value summary for a location
 *     parameters:
 *       - name: locationId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Location inventory and cost totals. }
 * /inventory/indents:
 *   get:
 *     tags: [Inventory]
 *     summary: List indents
 *     parameters:
 *       - name: locationId
 *         in: query
 *         schema: { type: string }
 *       - name: status
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Accessible material indents. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a site material indent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [locationId, items]
 *             properties:
 *               locationId: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [materialId, quantity]
 *                   properties:
 *                     materialId: { type: string }
 *                     quantity: { type: number, exclusiveMinimum: 0 }
 *               requiredDate: { type: string, format: date }
 *               notes: { type: string }
 *     responses:
 *       "201": { description: Indent submitted. }
 * /inventory/indents/{indentId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get an indent
 *     parameters:
 *       - name: indentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Indent details. }
 * /inventory/indents/{indentId}/fulfillment:
 *   patch:
 *     tags: [Inventory]
 *     summary: Fulfill an indent from another location or by purchase
 *     parameters:
 *       - name: indentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [method]
 *             properties:
 *               method: { type: string, enum: [transfer, purchase] }
 *               sourceLocationId: { type: string }
 *               vendorId: { type: string }
 *               items: { type: array, items: { type: object, additionalProperties: true } }
 *               deliveryDate: { type: string, format: date }
 *               shippingCost: { type: number, minimum: 0 }
 *     responses:
 *       "201": { description: Transfer request or purchase order created. }
 * /inventory/transfers:
 *   get:
 *     tags: [Inventory]
 *     summary: List internal transfer requests and orders
 *     parameters:
 *       - name: locationId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Accessible transfers. }
 *   post:
 *     tags: [Inventory]
 *     summary: Request an internal stock transfer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sourceLocationId, destinationLocationId, items]
 *             properties:
 *               sourceLocationId: { type: string }
 *               destinationLocationId: { type: string }
 *               indentId: { type: string }
 *               items: { type: array, items: { type: object, additionalProperties: true } }
 *               notes: { type: string }
 *     responses:
 *       "201": { description: Transfer requested. }
 * /inventory/transfers/{transferId}/approve:
 *   patch:
 *     tags: [Inventory]
 *     summary: Approve a transfer at its source location
 *     parameters:
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Transfer approved. }
 * /inventory/transfers/{transferId}/reject:
 *   patch:
 *     tags: [Inventory]
 *     summary: Reject a pending transfer
 *     parameters:
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Transfer rejected. }
 * /inventory/transfers/{transferId}/dispatch:
 *   post:
 *     tags: [Inventory]
 *     summary: Dispatch stock and deduct it from source inventory
 *     parameters:
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Transfer dispatched. }
 * /inventory/transfers/{transferId}/receive:
 *   post:
 *     tags: [Inventory]
 *     summary: Receive all or part of a dispatched transfer
 *     parameters:
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items: { type: array, items: { type: object, additionalProperties: true } }
 *               notes: { type: string }
 *     responses:
 *       "200": { description: Received quantities added to destination inventory. }
 * /inventory/vendors:
 *   get:
 *     tags: [Inventory]
 *     summary: List vendors
 *     responses:
 *       "200": { description: Active organization vendors. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a vendor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactName: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               taxId: { type: string }
 *               address: { type: string }
 *     responses:
 *       "201": { description: Vendor created. }
 * /inventory/purchase-orders:
 *   get:
 *     tags: [Inventory]
 *     summary: List purchase orders
 *     parameters:
 *       - name: locationId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Accessible purchase orders. }
 *   post:
 *     tags: [Inventory]
 *     summary: Create a purchase order from an indent
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [indentId, vendorId, items]
 *             properties:
 *               indentId: { type: string }
 *               vendorId: { type: string }
 *               deliveryDate: { type: string, format: date }
 *               shippingCost: { type: number, minimum: 0 }
 *               items: { type: array, items: { type: object, additionalProperties: true } }
 *     responses:
 *       "201": { description: Purchase order issued. }
 * /inventory/goods-receipts:
 *   get:
 *     tags: [Inventory]
 *     summary: List goods receipts
 *     parameters:
 *       - name: purchaseOrderId
 *         in: query
 *         schema: { type: string }
 *       - name: locationId
 *         in: query
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Goods receipt history. }
 *   post:
 *     tags: [Inventory]
 *     summary: Record an actual or partial delivery against a purchase order
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [purchaseOrderId, receivedDate, items]
 *             properties:
 *               purchaseOrderId: { type: string }
 *               receivedDate: { type: string, format: date }
 *               items: { type: array, items: { type: object, additionalProperties: true } }
 *               notes: { type: string }
 *     responses:
 *       "201": { description: Receipt recorded and stock updated. }
 * /inventory/locations/{locationId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a project site or warehouse
 *     parameters:
 *       - name: locationId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Location details. }
 *   patch:
 *     tags: [Inventory]
 *     summary: Update or deactivate a warehouse
 *     parameters:
 *       - name: locationId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Warehouse updated. }
 * /inventory/indents/{indentId}/reject:
 *   patch:
 *     tags: [Inventory]
 *     summary: Reject an unallocated indent
 *     parameters:
 *       - name: indentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Indent rejected. }
 * /inventory/indents/{indentId}/cancel:
 *   patch:
 *     tags: [Inventory]
 *     summary: Cancel an unallocated indent
 *     parameters:
 *       - name: indentId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Indent cancelled. }
 * /inventory/transfers/{transferId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a transfer request and dispatch/receipt history
 *     parameters:
 *       - name: transferId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Transfer details. }
 * /inventory/vendors/{vendorId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a vendor
 *     parameters:
 *       - name: vendorId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Vendor details. }
 *   patch:
 *     tags: [Inventory]
 *     summary: Update or deactivate a vendor
 *     parameters:
 *       - name: vendorId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Vendor updated. }
 * /inventory/purchase-orders/{purchaseOrderId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a purchase order
 *     parameters:
 *       - name: purchaseOrderId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Purchase order details. }
 * /inventory/purchase-orders/{purchaseOrderId}/cancel:
 *   patch:
 *     tags: [Inventory]
 *     summary: Cancel a purchase order before any goods are received
 *     parameters:
 *       - name: purchaseOrderId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Purchase order cancelled. }
 * /inventory/goods-receipts/{receiptId}:
 *   get:
 *     tags: [Inventory]
 *     summary: Get a goods receipt
 *     parameters:
 *       - name: receiptId
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       "200": { description: Goods receipt details. }
 */
router.use("/materials", ...requireInventoryRole);
router.use("/locations", ...requireInventoryRole);
router.use("/indents", ...requireInventoryRole);
router.use("/transfers", ...requireInventoryRole);
router.use("/vendors", ...requireInventoryRole);
router.use("/purchase-orders", ...requireInventoryRole);
router.use("/goods-receipts", ...requireInventoryRole);

router.get("/materials", controller.listMaterials);
router.post("/materials", controller.createMaterial);
router.get("/materials/:materialId", controller.getMaterial);
router.patch("/materials/:materialId", controller.updateMaterial);

router.get("/locations", controller.listLocations);
router.post("/locations", controller.createWarehouse);
router.get("/locations/:locationId", controller.getLocation);
router.patch("/locations/:locationId", controller.updateWarehouse);
router.get("/locations/:locationId/inventory", controller.getLocationInventory);

router.get("/indents", controller.listIndents);
router.post("/indents", controller.createIndent);
router.get("/indents/:indentId", controller.getIndent);
router.patch("/indents/:indentId/reject", controller.rejectIndent);
router.patch("/indents/:indentId/cancel", controller.cancelIndent);
router.patch("/indents/:indentId/fulfillment", controller.fulfillIndent);

router.get("/transfers", controller.listTransfers);
router.post("/transfers", controller.createTransferRequest);
router.get("/transfers/:transferId", controller.getTransfer);
router.patch("/transfers/:transferId/approve", controller.approveTransfer);
router.patch("/transfers/:transferId/reject", controller.rejectTransfer);
router.post("/transfers/:transferId/dispatch", controller.dispatchTransfer);
router.post("/transfers/:transferId/receive", controller.receiveTransfer);

router.get("/vendors", controller.listVendors);
router.post("/vendors", controller.createVendor);
router.get("/vendors/:vendorId", controller.getVendor);
router.patch("/vendors/:vendorId", controller.updateVendor);

router.get("/purchase-orders", controller.listPurchaseOrders);
router.post("/purchase-orders", controller.createPurchaseOrder);
router.get("/purchase-orders/:purchaseOrderId", controller.getPurchaseOrder);
router.patch("/purchase-orders/:purchaseOrderId/cancel", controller.cancelPurchaseOrder);

router.get("/goods-receipts", controller.listGoodsReceipts);
router.post("/goods-receipts", controller.createGoodsReceipt);
router.get("/goods-receipts/:receiptId", controller.getGoodsReceipt);

module.exports = router;
