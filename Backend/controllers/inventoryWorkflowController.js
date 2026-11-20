const mongoose = require("mongoose");
const InventoryGoodsReceipt = require("../models/InventoryGoodsReceipt");
const InventoryIndent = require("../models/InventoryIndent");
const InventoryItem = require("../models/inventoryItem");
const InventoryLocation = require("../models/InventoryLocation");
const InventoryMaterial = require("../models/InventoryMaterial");
const InventoryPurchase = require("../models/InventoryPurchase");
const InventoryPurchaseOrder = require("../models/InventoryPurchaseOrder");
const InventoryTransfer = require("../models/InventoryTransfer");
const InventoryUsage = require("../models/InventoryUsage");
const InventoryVendor = require("../models/InventoryVendor");
const Project = require("../models/project");
const {
  addStock,
  findStockItem,
  getAccessibleLocation,
  getAuthorizedProject,
  getProjectLocation
} = require("../utils/inventoryWorkflow");
const {
  allocateTransferReceiptCosts,
  isDateOnly,
  isNonNegativeNumber,
  isPositiveNumber
} = require("../utils/inventoryWorkflowRules");
const isAllowedOperator = (user) => ["Founder", "Site Engineer"].includes(user?.role);

const sendError = (res, status, message) =>
  res.status(status).json({ success: false, message });

const emitIndentUpdate = (req, location, indent, action) => {
  const io = req.app.get("io");
  if (!io || !location?.projectId) return;
  io.to(`project-${location.projectId}`).emit("inventory:indent-updated", {
    projectId: String(location.projectId),
    locationId: String(location._id),
    indentId: String(indent._id),
    actorId: String(req.user.User_id),
    action
  });
};

const loadMaterialLines = async (lines, organizationId) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "At least one material is required" };
  }

  const seen = new Set();
  const parsed = [];
  for (const line of lines) {
    if (
      !mongoose.isValidObjectId(line?.materialId) ||
      !isPositiveNumber(line?.quantity) ||
      seen.has(String(line.materialId))
    ) {
      return { error: "Each material must be valid, unique, and have a positive quantity" };
    }
    seen.add(String(line.materialId));
    parsed.push({ materialId: line.materialId, quantity: Number(line.quantity) });
  }

  const materials = await InventoryMaterial.find({
    _id: { $in: parsed.map((line) => line.materialId) },
    organizationId,
    isActive: true
  });
  if (materials.length !== parsed.length) {
    return { error: "One or more materials were not found or are inactive" };
  }

  const materialById = new Map(materials.map((material) => [String(material._id), material]));
  return {
    items: parsed.map(({ materialId, quantity }) => {
      const material = materialById.get(String(materialId));
      return {
        materialId: material._id,
        materialName: material.name,
        unit: material.unit,
        quantity
      };
    })
  };
};

const accessibleIndent = async (indentId, user) => {
  if (!mongoose.isValidObjectId(indentId)) {
    return { error: { status: 400, message: "Invalid indent ID" } };
  }
  const indent = await InventoryIndent.findOne({
    _id: indentId,
    organizationId: user.organizationId
  });
  if (!indent) return { error: { status: 404, message: "Indent not found" } };
  const locationAccess = await getAccessibleLocation(indent.locationId, user);
  if (locationAccess.error) return locationAccess;
  return { indent, location: locationAccess.location };
};

const accessibleTransfer = async (transferId, user) => {
  if (!mongoose.isValidObjectId(transferId)) {
    return { error: { status: 400, message: "Invalid transfer ID" } };
  }
  const transfer = await InventoryTransfer.findOne({
    _id: transferId,
    organizationId: user.organizationId
  });
  if (!transfer) return { error: { status: 404, message: "Transfer not found" } };
  return { transfer };
};

const refreshIndentStatus = async (indent) => {
  const fulfilled = indent.items.every((item) => item.fulfilledQuantity >= item.requestedQuantity);
  const partlyFulfilled = indent.items.some((item) => item.fulfilledQuantity > 0);
  indent.status = fulfilled ? "fulfilled" : partlyFulfilled ? "partially_fulfilled" : "sourcing";
  await indent.save();
};

const addIndentFulfillment = async (indent, lines) => {
  for (const line of lines) {
    const target = indent.items.find(
      (item) => String(item.materialId) === String(line.materialId)
    );
    if (target) {
      target.fulfilledQuantity += line.quantity;
      target.allocatedQuantity = Math.max(0, target.allocatedQuantity - line.quantity);
    }
  }
  await refreshIndentStatus(indent);
};

const resolveDispatchLines = (transfer, lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return transfer.items
      .map((item) => ({
        materialId: item.materialId,
        quantity: item.requestedQuantity - item.dispatchedQuantity
      }))
      .filter((item) => item.quantity > 0);
  }

  const seen = new Set();
  const parsed = [];
  for (const line of lines) {
    if (
      !mongoose.isValidObjectId(line?.materialId) ||
      !isPositiveNumber(line?.quantity) ||
      seen.has(String(line.materialId))
    ) {
      return { error: "Each material must be valid, unique, and have a positive quantity" };
    }
    seen.add(String(line.materialId));
    const transferItem = transfer.items.find(
      (item) => String(item.materialId) === String(line.materialId)
    );
    if (!transferItem || Number(line.quantity) > transferItem.requestedQuantity - transferItem.dispatchedQuantity) {
      return { error: "Dispatched quantity exceeds the pending transfer quantity" };
    }
    parsed.push({ materialId: line.materialId, quantity: Number(line.quantity) });
  }
  return parsed;
};

const resolveReceiptLines = (transfer, lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    return { error: "At least one received quantity is required" };
  }

  const seen = new Set();
  const parsed = [];
  for (const line of lines) {
    if (
      !mongoose.isValidObjectId(line?.materialId) ||
      !isPositiveNumber(line?.quantity) ||
      seen.has(String(line.materialId))
    ) {
      return { error: "Each material must be valid, unique, and have a positive quantity" };
    }
    seen.add(String(line.materialId));
    const transferItem = transfer.items.find(
      (item) => String(item.materialId) === String(line.materialId)
    );
    if (!transferItem || Number(line.quantity) > transferItem.dispatchedQuantity - transferItem.receivedQuantity) {
      return { error: "Received quantity exceeds the dispatched quantity" };
    }
    parsed.push({ materialId: line.materialId, quantity: Number(line.quantity) });
  }
  return parsed;
};

const createPurchaseOrder = async ({ indent, location, user, vendorId, body }) => {
  if (["fulfilled", "rejected", "cancelled"].includes(indent.status)) {
    return { error: { status: 400, message: "This indent can no longer be fulfilled" } };
  }
  if (location.type === "project_site") {
    const project = await Project.findById(location.projectId).select("status");
    if (!project || project.status === "Completed") {
      return { error: { status: 400, message: "Inventory is locked for completed projects" } };
    }
  }
  if (!mongoose.isValidObjectId(vendorId)) {
    return { error: { status: 400, message: "A valid vendor is required" } };
  }
  const vendor = await InventoryVendor.findOne({
    _id: vendorId,
    organizationId: user.organizationId,
    isActive: true
  });
  if (!vendor) return { error: { status: 404, message: "Vendor not found or inactive" } };

  if (
    body.deliveryDate != null &&
    body.deliveryDate !== "" &&
    !isDateOnly(body.deliveryDate)
  ) {
    return { error: { status: 400, message: "Delivery date must be a valid YYYY-MM-DD date" } };
  }
  const shippingCost = body.shippingCost == null ? 0 : Number(body.shippingCost);
  if (!isNonNegativeNumber(shippingCost)) {
    return { error: { status: 400, message: "Shipping cost must be zero or greater" } };
  }

  const remaining = indent.items
    .map((item) => ({
      materialId: item.materialId,
      remainingQuantity: item.requestedQuantity - item.fulfilledQuantity - item.allocatedQuantity,
      materialName: item.materialName,
      unit: item.unit
    }))
    .filter((item) => item.remainingQuantity > 0);
  if (!remaining.length) {
    return { error: { status: 400, message: "This indent has no quantity left to fulfill" } };
  }

  const requestedLines = body.items ?? remaining.map((item) => ({
    materialId: item.materialId,
    orderedQuantity: item.remainingQuantity,
    unitPrice: undefined,
    taxRate: 0
  }));
  if (!Array.isArray(requestedLines) || !requestedLines.length) {
    return { error: { status: 400, message: "At least one purchase order line is required" } };
  }

  const seen = new Set();
  const orderItems = [];
  for (const line of requestedLines) {
    const materialId = String(line?.materialId);
    const indentItem = remaining.find((item) => String(item.materialId) === materialId);
    const quantity = Number(line?.orderedQuantity);
    const unitPrice = Number(line?.unitPrice);
    const taxRate = line?.taxRate == null ? 0 : Number(line.taxRate);
    if (
      !indentItem ||
      seen.has(materialId) ||
      !isPositiveNumber(quantity) ||
      quantity > indentItem.remainingQuantity ||
      line?.unitPrice == null ||
      line?.unitPrice === "" ||
      !isNonNegativeNumber(unitPrice) ||
      !isNonNegativeNumber(taxRate) ||
      taxRate > 100
    ) {
      return { error: { status: 400, message: "Purchase order lines must match remaining indent quantities and contain valid pricing" } };
    }
    seen.add(materialId);
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * taxRate / 100;
    orderItems.push({
      materialId: indentItem.materialId,
      materialName: indentItem.materialName,
      unit: indentItem.unit,
      orderedQuantity: quantity,
      unitPrice,
      taxRate,
      taxAmount,
      lineTotal: subtotal + taxAmount
    });
  }

  const subtotal = orderItems.reduce(
    (total, item) => total + item.orderedQuantity * item.unitPrice,
    0
  );
  const taxAmount = orderItems.reduce((total, item) => total + item.taxAmount, 0);
  const purchaseOrder = await InventoryPurchaseOrder.create({
    organizationId: user.organizationId,
    indentId: indent._id,
    locationId: location._id,
    vendorId: vendor._id,
    vendorSnapshot: {
      name: vendor.name,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      taxId: vendor.taxId,
      address: vendor.address
    },
    items: orderItems,
    deliveryDate: body.deliveryDate || undefined,
    shippingCost,
    subtotal,
    taxAmount,
    totalAmount: subtotal + taxAmount + shippingCost,
    notes: typeof body.notes === "string" ? body.notes.trim() : "",
    createdBy: user.User_id
  });

  indent.purchaseOrderIds.push(purchaseOrder._id);
  for (const line of orderItems) {
    const indentItem = indent.items.find(
      (item) => String(item.materialId) === String(line.materialId)
    );
    indentItem.allocatedQuantity += line.orderedQuantity;
  }
  if (indent.status === "submitted") indent.status = "sourcing";
  await indent.save();
  return { purchaseOrder };
};

exports.listMaterials = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.includeInactive !== "true") filter.isActive = true;
    const materials = await InventoryMaterial.find(filter).sort({ category: 1, name: 1 });
    return res.status(200).json({ success: true, materials });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const { name, category, unit, specifications = {} } = req.body;
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof unit !== "string" ||
      !unit.trim() ||
      !specifications ||
      typeof specifications !== "object" ||
      Array.isArray(specifications)
    ) {
      return sendError(res, 400, "Material name, category, unit, and object specifications are required");
    }

    const normalizedName = name.trim().toLowerCase();
    const normalizedUnit = unit.trim().toLowerCase();
    const duplicate = await InventoryMaterial.findOne({
      organizationId: req.user.organizationId,
      normalizedName,
      normalizedUnit
    });
    if (duplicate) return sendError(res, 409, "A material with this name and unit already exists");

    const material = await InventoryMaterial.create({
      organizationId: req.user.organizationId,
      name: name.trim(),
      normalizedName,
      category: category.trim(),
      unit: unit.trim(),
      normalizedUnit,
      specifications,
      createdBy: req.user.User_id
    });
    return res.status(201).json({ success: true, material });
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, "A material with this name and unit already exists");
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getMaterial = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.materialId)) return sendError(res, 400, "Invalid material ID");
    const material = await InventoryMaterial.findOne({
      _id: req.params.materialId,
      organizationId: req.user.organizationId
    });
    if (!material) return sendError(res, 404, "Material not found");
    return res.status(200).json({ success: true, material });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.materialId)) return sendError(res, 400, "Invalid material ID");
    const material = await InventoryMaterial.findOne({
      _id: req.params.materialId,
      organizationId: req.user.organizationId
    });
    if (!material) return sendError(res, 404, "Material not found");

    const { name, category, unit, specifications, isActive } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Material name is required");
      material.name = name.trim();
      material.normalizedName = name.trim().toLowerCase();
    }
    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) return sendError(res, 400, "Category is required");
      material.category = category.trim();
    }
    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) return sendError(res, 400, "Unit is required");
      material.unit = unit.trim();
      material.normalizedUnit = unit.trim().toLowerCase();
    }
    if (specifications !== undefined) {
      if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
        return sendError(res, 400, "Specifications must be an object");
      }
      material.specifications = specifications;
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") return sendError(res, 400, "isActive must be a boolean");
      material.isActive = isActive;
    }
    await material.save();
    return res.status(200).json({ success: true, material });
  } catch (error) {
    if (error.code === 11000) return sendError(res, 409, "A material with this name and unit already exists");
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listLocations = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    if (req.query.projectId) {
      const access = await getAuthorizedProject(req.query.projectId, req.user);
      if (access.error) return sendError(res, access.error.status, access.error.message);
      const location = await getProjectLocation(access.project);
      return res.status(200).json({ success: true, locations: [location] });
    }

    const projectFilter = { organizationId: req.user.organizationId };
    if (req.user.role === "Founder") projectFilter.contractor = req.user.User_id;
    else projectFilter.siteEngineers = req.user.User_id;
    const [projects, warehouses] = await Promise.all([
      Project.find(projectFilter).select("_id title organizationId contractor"),
      InventoryLocation.find({
        organizationId: req.user.organizationId,
        type: "warehouse",
        isActive: true
      }).sort({ name: 1 })
    ]);
    const projectLocations = await Promise.all(projects.map(getProjectLocation));
    return res.status(200).json({
      success: true,
      locations: [...projectLocations, ...warehouses]
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createWarehouse = async (req, res) => {
  try {
    if (req.user.role !== "Founder") return sendError(res, 403, "Only a Founder can create a warehouse");
    const { name, code = "", address = "" } = req.body;
    if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Warehouse name is required");
    if (typeof code !== "string" || typeof address !== "string") {
      return sendError(res, 400, "Warehouse code and address must be strings");
    }
    const location = await InventoryLocation.create({
      organizationId: req.user.organizationId,
      name: name.trim(),
      type: "warehouse",
      code: code.trim(),
      address: address.trim(),
      createdBy: req.user.User_id
    });
    return res.status(201).json({ success: true, location });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getLocation = async (req, res) => {
  try {
    const access = await getAccessibleLocation(req.params.locationId, req.user);
    if (access.error) return sendError(res, access.error.status, access.error.message);
    return res.status(200).json({ success: true, location: access.location });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getLocationInventory = async (req, res) => {
  try {
    const access = await getAccessibleLocation(req.params.locationId, req.user);
    if (access.error) return sendError(res, access.error.status, access.error.message);
    const location = access.location;
    if (location.type === "project_site") {
      const project = await Project.findOne({
        _id: location.projectId,
        organizationId: req.user.organizationId
      });
      if (!project) return sendError(res, 404, "Project not found");
      await getProjectLocation(project);
    }
    const filter = {
      organizationId: req.user.organizationId,
      locationId: location._id
    };
    const [items, purchases, usages, transfers] = await Promise.all([
      InventoryItem.find(filter)
        .populate("materialId", "name category unit specifications")
        .sort({ name: 1 }),
      InventoryPurchase.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(req.user.organizationId),
            $or: [
              { locationId: location._id },
              ...(location.projectId ? [{ projectId: location.projectId }] : [])
            ]
          }
        },
        {
          $group: {
            _id: "$inventoryItemId",
            totalPurchasedValue: { $sum: { $multiply: ["$quantity", "$pricePerUnit"] } }
          }
        }
      ]),
      InventoryUsage.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(req.user.organizationId),
            $or: [
              { locationId: location._id },
              ...(location.projectId ? [{ projectId: location.projectId }] : [])
            ]
          }
        },
        { $group: { _id: "$inventoryItemId", totalUsedCost: { $sum: "$costAtThatTime" } } }
      ]),
      InventoryTransfer.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(req.user.organizationId),
            destinationLocationId: location._id
          }
        },
        { $unwind: "$receipts" },
        { $unwind: "$receipts.items" },
        {
          $group: {
            _id: "$receipts.items.inventoryItemId",
            transferredInValue: {
              $sum: {
                $multiply: ["$receipts.items.quantity", "$receipts.items.unitCost"]
              }
            }
          }
        }
      ])
    ]);
    const purchaseTotals = new Map(
      purchases.map((purchase) => [String(purchase._id), purchase.totalPurchasedValue])
    );
    const usageTotals = new Map(
      usages.map((usage) => [String(usage._id), usage.totalUsedCost])
    );
    const transferTotals = new Map(
      transfers.map((transfer) => [String(transfer._id), transfer.transferredInValue])
    );
    const itemsWithValues = items.map((item) => ({
      ...item.toObject(),
      isLowStock: item.availableQuantity <= item.totalQuantity * 0.2,
      totalPurchasedValue: purchaseTotals.has(String(item._id))
        ? purchaseTotals.get(String(item._id))
        : transferTotals.has(String(item._id))
          ? 0
          : item.totalQuantity * item.pricePerUnit,
      transferredInValue: transferTotals.get(String(item._id)) || 0,
      totalUsedCost: usageTotals.get(String(item._id)) || 0,
      remainingStockValue: item.availableQuantity * item.pricePerUnit
    }));
    return res.status(200).json({
      success: true,
      location,
      items: itemsWithValues,
      summary: {
        totalPurchasedValue: itemsWithValues.reduce((total, item) => total + item.totalPurchasedValue, 0),
        totalUsedCost: itemsWithValues.reduce((total, item) => total + item.totalUsedCost, 0),
        remainingStockValue: itemsWithValues.reduce((total, item) => total + item.remainingStockValue, 0)
      }
    });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.updateWarehouse = async (req, res) => {
  try {
    if (req.user.role !== "Founder") return sendError(res, 403, "Only a Founder can update a warehouse");
    const locationAccess = await getAccessibleLocation(req.params.locationId, req.user);
    if (locationAccess.error) return sendError(res, locationAccess.error.status, locationAccess.error.message);
    const location = locationAccess.location;
    if (location.type !== "warehouse") return sendError(res, 400, "Project site locations are managed by their project");
    const { name, code, address, isActive } = req.body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Warehouse name is required");
      location.name = name.trim();
    }
    if (code !== undefined) {
      if (typeof code !== "string") return sendError(res, 400, "Warehouse code must be a string");
      location.code = code.trim();
    }
    if (address !== undefined) {
      if (typeof address !== "string") return sendError(res, 400, "Warehouse address must be a string");
      location.address = address.trim();
    }
    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") return sendError(res, 400, "isActive must be a boolean");
      location.isActive = isActive;
    }
    await location.save();
    return res.status(200).json({ success: true, location });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createIndent = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const { locationId, items, requiredDate, notes = "" } = req.body;
    const locationAccess = await getAccessibleLocation(locationId, req.user);
    if (locationAccess.error) return sendError(res, locationAccess.error.status, locationAccess.error.message);
    const location = locationAccess.location;
    if (location.type !== "project_site") {
      return sendError(res, 400, "Indents must be created for a project site");
    }
    if (locationAccess.project?.status === "Completed") {
      return sendError(res, 400, "Inventory is locked for completed projects");
    }
    if (requiredDate && !isDateOnly(requiredDate)) return sendError(res, 400, "Required date must be YYYY-MM-DD");
    if (typeof notes !== "string") return sendError(res, 400, "Notes must be a string");

    const parsed = await loadMaterialLines(items, req.user.organizationId);
    if (parsed.error) return sendError(res, 400, parsed.error);
    const indent = await InventoryIndent.create({
      organizationId: req.user.organizationId,
      locationId: location._id,
      requestedBy: req.user.User_id,
      items: parsed.items.map((item) => ({
        materialId: item.materialId,
        materialName: item.materialName,
        unit: item.unit,
        requestedQuantity: item.quantity
      })),
      requiredDate: requiredDate || undefined,
      notes: notes.trim()
    });
    emitIndentUpdate(req, location, indent, "created");
    return res.status(201).json({ success: true, indent });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listIndents = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status) {
      const statuses = ["submitted", "sourcing", "partially_fulfilled", "fulfilled", "rejected", "cancelled"];
      if (!statuses.includes(req.query.status)) return sendError(res, 400, "Invalid indent status");
      filter.status = req.query.status;
    }
    if (req.user.role === "Site Engineer" && !req.query.locationId) {
      return sendError(res, 400, "locationId is required");
    }
    if (req.query.locationId) {
      const access = await getAccessibleLocation(req.query.locationId, req.user);
      if (access.error) return sendError(res, access.error.status, access.error.message);
      filter.locationId = access.location._id;
    } else if (req.user.role === "Founder") {
      const projects = await Project.find({
        organizationId: req.user.organizationId,
        contractor: req.user.User_id
      }).select("_id");
      const locations = await InventoryLocation.find({
        organizationId: req.user.organizationId,
        type: "warehouse"
      }).select("_id");
      filter.locationId = {
        $in: [
          ...locations.map((location) => location._id),
          ...(await Promise.all(projects.map(getProjectLocation))).map((location) => location._id)
        ]
      };
    }
    const indents = await InventoryIndent.find(filter)
      .populate("locationId", "name type projectId")
      .populate("requestedBy", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, indents });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getIndent = async (req, res) => {
  try {
    const result = await accessibleIndent(req.params.indentId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const indent = await InventoryIndent.findById(result.indent._id)
      .populate("locationId", "name type projectId")
      .populate("requestedBy", "name");
    return res.status(200).json({ success: true, indent });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.rejectIndent = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const result = await accessibleIndent(req.params.indentId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { indent, location } = result;
    if (["fulfilled", "rejected", "cancelled"].includes(indent.status)) {
      return sendError(res, 400, "This indent can no longer be rejected");
    }
    if (indent.items.some((item) => item.allocatedQuantity > 0 || item.fulfilledQuantity > 0)) {
      return sendError(res, 409, "An indent with allocated or fulfilled quantities cannot be rejected");
    }
    indent.status = "rejected";
    await indent.save();
    emitIndentUpdate(req, location, indent, "rejected");
    return res.status(200).json({ success: true, indent });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.cancelIndent = async (req, res) => {
  try {
    const result = await accessibleIndent(req.params.indentId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { indent, location } = result;
    if (
      String(indent.requestedBy) !== String(req.user.User_id) &&
      req.user.role !== "Founder"
    ) {
      return sendError(res, 403, "Only the requester or a Founder can cancel this indent");
    }
    if (["fulfilled", "rejected", "cancelled"].includes(indent.status)) {
      return sendError(res, 400, "This indent can no longer be cancelled");
    }
    if (indent.items.some((item) => item.allocatedQuantity > 0 || item.fulfilledQuantity > 0)) {
      return sendError(res, 409, "An indent with allocated or fulfilled quantities cannot be cancelled");
    }
    indent.status = "cancelled";
    await indent.save();
    emitIndentUpdate(req, location, indent, "cancelled");
    return res.status(200).json({ success: true, indent });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.fulfillIndent = async (req, res) => {
  try {
    const result = await accessibleIndent(req.params.indentId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { indent, location } = result;
    if (["fulfilled", "rejected", "cancelled"].includes(indent.status)) {
      return sendError(res, 400, "This indent can no longer be fulfilled");
    }
    const { method } = req.body;
    if (method === "purchase") {
      const orderResult = await createPurchaseOrder({
        indent,
        location,
        user: req.user,
        vendorId: req.body.vendorId,
        body: req.body
      });
      if (orderResult.error) {
        return sendError(res, orderResult.error.status, orderResult.error.message);
      }
      emitIndentUpdate(req, location, indent, "purchase_order_created");
      return res.status(201).json({ success: true, purchaseOrder: orderResult.purchaseOrder });
    }
    if (method !== "transfer") return sendError(res, 400, "method must be purchase or transfer");

    const sourceLocationId = req.body.sourceLocationId;
    if (!mongoose.isValidObjectId(sourceLocationId) || String(sourceLocationId) === String(location._id)) {
      return sendError(res, 400, "A different source location is required");
    }
    const sourceLocation = await InventoryLocation.findOne({
      _id: sourceLocationId,
      organizationId: req.user.organizationId,
      isActive: true
    });
    if (!sourceLocation) return sendError(res, 404, "Source location not found");
    const transferItems = indent.items
      .map((item) => ({
        materialId: item.materialId,
        materialName: item.materialName,
        unit: item.unit,
        requestedQuantity: item.requestedQuantity - item.fulfilledQuantity - item.allocatedQuantity
      }))
      .filter((item) => item.requestedQuantity > 0);
    if (!transferItems.length) return sendError(res, 400, "This indent has no quantity left to fulfill");

    const transfer = await InventoryTransfer.create({
      organizationId: req.user.organizationId,
      indentId: indent._id,
      sourceLocationId: sourceLocation._id,
      destinationLocationId: location._id,
      requestedBy: req.user.User_id,
      items: transferItems,
      notes: typeof req.body.notes === "string" ? req.body.notes.trim() : ""
    });
    indent.transferIds.push(transfer._id);
    for (const line of transferItems) {
      const indentItem = indent.items.find(
        (item) => String(item.materialId) === String(line.materialId)
      );
      indentItem.allocatedQuantity += line.requestedQuantity;
    }
    if (indent.status === "submitted") indent.status = "sourcing";
    await indent.save();
    emitIndentUpdate(req, location, indent, "transfer_requested");
    return res.status(201).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listVendors = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.includeInactive !== "true") filter.isActive = true;
    const vendors = await InventoryVendor.find(filter).sort({ name: 1 });
    return res.status(200).json({ success: true, vendors });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createVendor = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const { name, contactName = "", email = "", phone = "", taxId = "", address = "" } = req.body;
    if (typeof name !== "string" || !name.trim()) return sendError(res, 400, "Vendor name is required");
    if (![contactName, email, phone, taxId, address].every((value) => typeof value === "string")) {
      return sendError(res, 400, "Vendor contact details must be strings");
    }

    const vendor = await InventoryVendor.create({
      organizationId: req.user.organizationId,
      name: name.trim(),
      contactName: contactName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      taxId: taxId.trim(),
      address: address.trim(),
      createdBy: req.user.User_id
    });
    return res.status(201).json({ success: true, vendor });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getVendor = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.vendorId)) return sendError(res, 400, "Invalid vendor ID");
    const vendor = await InventoryVendor.findOne({
      _id: req.params.vendorId,
      organizationId: req.user.organizationId
    });
    if (!vendor) return sendError(res, 404, "Vendor not found");
    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.updateVendor = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.vendorId)) return sendError(res, 400, "Invalid vendor ID");
    const vendor = await InventoryVendor.findOne({
      _id: req.params.vendorId,
      organizationId: req.user.organizationId
    });
    if (!vendor) return sendError(res, 404, "Vendor not found");
    for (const field of ["name", "contactName", "email", "phone", "taxId", "address"]) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== "string") return sendError(res, 400, `${field} must be a string`);
      if (field === "name" && !req.body[field].trim()) return sendError(res, 400, "Vendor name is required");
      vendor[field] = field === "email" ? req.body[field].trim().toLowerCase() : req.body[field].trim();
    }
    if (req.body.isActive !== undefined) {
      if (typeof req.body.isActive !== "boolean") return sendError(res, 400, "isActive must be a boolean");
      vendor.isActive = req.body.isActive;
    }
    await vendor.save();
    return res.status(200).json({ success: true, vendor });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createTransferRequest = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const { sourceLocationId, destinationLocationId, indentId, items, notes = "" } = req.body;
    if (
      !mongoose.isValidObjectId(sourceLocationId) ||
      !mongoose.isValidObjectId(destinationLocationId) ||
      String(sourceLocationId) === String(destinationLocationId)
    ) {
      return sendError(res, 400, "Different valid source and destination locations are required");
    }
    const destinationAccess = await getAccessibleLocation(destinationLocationId, req.user);
    if (destinationAccess.error) {
      return sendError(res, destinationAccess.error.status, destinationAccess.error.message);
    }
    if (destinationAccess.project?.status === "Completed") {
      return sendError(res, 400, "Inventory is locked for completed projects");
    }
    const sourceLocation = await InventoryLocation.findOne({
      _id: sourceLocationId,
      organizationId: req.user.organizationId,
      isActive: true
    });
    if (!sourceLocation) return sendError(res, 404, "Source location not found");

    let requestItems;
    if (indentId) {
      const indentResult = await accessibleIndent(indentId, req.user);
      if (indentResult.error) {
        return sendError(res, indentResult.error.status, indentResult.error.message);
      }
      if (["fulfilled", "rejected", "cancelled"].includes(indentResult.indent.status)) {
        return sendError(res, 400, "This indent can no longer be fulfilled");
      }
      if (String(indentResult.location._id) !== String(destinationLocationId)) {
        return sendError(res, 400, "Transfer destination must match the indent location");
      }
      requestItems = indentResult.indent.items
        .map((item) => ({
          materialId: item.materialId,
          materialName: item.materialName,
          unit: item.unit,
          requestedQuantity: item.requestedQuantity - item.fulfilledQuantity - item.allocatedQuantity
        }))
        .filter((item) => item.requestedQuantity > 0);
      if (!requestItems.length) return sendError(res, 400, "This indent has no quantity left to fulfill");
    } else {
      const parsed = await loadMaterialLines(items, req.user.organizationId);
      if (parsed.error) return sendError(res, 400, parsed.error);
      requestItems = parsed.items.map((item) => ({
        materialId: item.materialId,
        materialName: item.materialName,
        unit: item.unit,
        requestedQuantity: item.quantity
      }));
    }
    if (typeof notes !== "string") return sendError(res, 400, "Notes must be a string");

    const transfer = await InventoryTransfer.create({
      organizationId: req.user.organizationId,
      indentId: indentId || undefined,
      sourceLocationId: sourceLocation._id,
      destinationLocationId,
      requestedBy: req.user.User_id,
      items: requestItems,
      notes: notes.trim()
    });
    if (indentId) {
      const indent = await InventoryIndent.findById(indentId);
      indent.transferIds.push(transfer._id);
      for (const line of requestItems) {
        const indentItem = indent.items.find(
          (item) => String(item.materialId) === String(line.materialId)
        );
        indentItem.allocatedQuantity += line.requestedQuantity;
      }
      if (indent.status === "submitted") indent.status = "sourcing";
      await indent.save();
      emitIndentUpdate(req, destinationAccess.location, indent, "transfer_requested");
    }
    return res.status(201).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listTransfers = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status) {
      const statuses = ["requested", "approved", "in_transit", "partially_received", "received", "rejected", "cancelled"];
      if (!statuses.includes(req.query.status)) return sendError(res, 400, "Invalid transfer status");
      filter.status = req.query.status;
    }
    const locationId = req.query.locationId;
    if (req.user.role === "Site Engineer" && !locationId) {
      return sendError(res, 400, "locationId is required");
    }
    if (locationId) {
      const access = await getAccessibleLocation(locationId, req.user);
      if (access.error) return sendError(res, access.error.status, access.error.message);
      filter.$or = [
        { sourceLocationId: access.location._id },
        { destinationLocationId: access.location._id }
      ];
    }
    const transfers = await InventoryTransfer.find(filter)
      .populate("sourceLocationId", "name type projectId")
      .populate("destinationLocationId", "name type projectId")
      .populate("requestedBy", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, transfers });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getTransfer = async (req, res) => {
  try {
    const result = await accessibleTransfer(req.params.transferId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { transfer } = result;
    const [sourceAccess, destinationAccess] = await Promise.all([
      getAccessibleLocation(transfer.sourceLocationId, req.user),
      getAccessibleLocation(transfer.destinationLocationId, req.user)
    ]);
    if (sourceAccess.error && destinationAccess.error) {
      return sendError(res, 403, "You are not authorized to access this transfer");
    }
    return res.status(200).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.approveTransfer = async (req, res) => {
  try {
    const result = await accessibleTransfer(req.params.transferId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { transfer } = result;
    const sourceAccess = await getAccessibleLocation(transfer.sourceLocationId, req.user);
    if (sourceAccess.error) return sendError(res, sourceAccess.error.status, sourceAccess.error.message);
    if (sourceAccess.project?.status === "Completed") {
      return sendError(res, 400, "Inventory is locked for completed projects");
    }
    if (transfer.status !== "requested") return sendError(res, 400, "Only requested transfers can be approved");
    transfer.status = "approved";
    transfer.approvedBy = req.user.User_id;
    await transfer.save();
    return res.status(200).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.rejectTransfer = async (req, res) => {
  try {
    const result = await accessibleTransfer(req.params.transferId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { transfer } = result;
    const sourceAccess = await getAccessibleLocation(transfer.sourceLocationId, req.user);
    if (sourceAccess.error) return sendError(res, sourceAccess.error.status, sourceAccess.error.message);
    if (transfer.status !== "requested") return sendError(res, 400, "Only requested transfers can be rejected");
    transfer.status = "rejected";
    await transfer.save();
    if (transfer.indentId) {
      const indent = await InventoryIndent.findById(transfer.indentId);
      if (indent) {
        for (const line of transfer.items) {
          const indentItem = indent.items.find(
            (item) => String(item.materialId) === String(line.materialId)
          );
          if (indentItem) {
            indentItem.allocatedQuantity = Math.max(
              0,
              indentItem.allocatedQuantity - line.requestedQuantity
            );
          }
        }
        await indent.save();
        const destination = await InventoryLocation.findOne({
          _id: transfer.destinationLocationId,
          organizationId: req.user.organizationId
        });
        if (destination) emitIndentUpdate(req, destination, indent, "transfer_rejected");
      }
    }
    return res.status(200).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.dispatchTransfer = async (req, res) => {
  try {
    const result = await accessibleTransfer(req.params.transferId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { transfer } = result;
    const sourceAccess = await getAccessibleLocation(transfer.sourceLocationId, req.user);
    if (sourceAccess.error) return sendError(res, sourceAccess.error.status, sourceAccess.error.message);
    if (!["approved", "in_transit", "partially_received"].includes(transfer.status)) {
      return sendError(res, 400, "Only approved transfers can be dispatched");
    }

    const lines = resolveDispatchLines(transfer, req.body.items);
    if (lines.error) return sendError(res, 400, lines.error);
    if (!lines.length) return sendError(res, 400, "No transfer quantities remain to dispatch");
    const materials = await InventoryMaterial.find({
      _id: { $in: lines.map((line) => line.materialId) },
      organizationId: req.user.organizationId
    });
    const materialById = new Map(materials.map((material) => [String(material._id), material]));
    const changedItems = [];
    const dispatchItems = [];

    try {
      for (const line of lines) {
        const material = materialById.get(String(line.materialId));
        if (!material) throw new Error("A transfer material no longer exists");
        const stock = await findStockItem(sourceAccess.location, material);
        if (!stock) throw new Error(`Insufficient stock for ${material.name}`);
        const updated = await InventoryItem.findOneAndUpdate(
          { _id: stock._id, availableQuantity: { $gte: line.quantity } },
          { $inc: { availableQuantity: -line.quantity } },
          { new: true }
        );
        if (!updated) throw new Error(`Insufficient stock for ${material.name}`);
        changedItems.push({ itemId: updated._id, quantity: line.quantity, item: updated });
        const transferItem = transfer.items.find(
          (item) => String(item.materialId) === String(line.materialId)
        );
        const totalDispatched = transferItem.dispatchedQuantity + line.quantity;
        transferItem.unitCost =
          (transferItem.dispatchedQuantity * transferItem.unitCost +
            line.quantity * updated.pricePerUnit) /
          totalDispatched;
        transferItem.dispatchedQuantity += line.quantity;
        dispatchItems.push({
          materialId: line.materialId,
          quantity: line.quantity,
          unitCost: updated.pricePerUnit
        });
      }
    } catch (error) {
      await Promise.all(changedItems.map(({ itemId, quantity }) =>
        InventoryItem.updateOne({ _id: itemId }, { $inc: { availableQuantity: quantity } })
      ));
      return sendError(res, 409, error.message);
    }

    transfer.dispatches.push({
      dispatchedBy: req.user.User_id,
      items: dispatchItems
    });
    transfer.dispatchedBy = req.user.User_id;
    transfer.status = transfer.items.some((item) => item.receivedQuantity > 0)
      ? "partially_received"
      : "in_transit";
    await transfer.save();
    const io = req.app.get("io");
    if (io && sourceAccess.location.projectId) {
      for (const changed of changedItems) {
        io.to(`project-${sourceAccess.location.projectId}`).emit("inventory:updated", {
          inventoryItemId: changed.item._id,
          availableQuantity: changed.item.availableQuantity,
          updatedBy: req.user.User_id,
          isLowStock: changed.item.availableQuantity <= changed.item.totalQuantity * 0.2
        });
      }
    }
    return res.status(200).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.receiveTransfer = async (req, res) => {
  try {
    const result = await accessibleTransfer(req.params.transferId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const { transfer } = result;
    const destinationAccess = await getAccessibleLocation(transfer.destinationLocationId, req.user);
    if (destinationAccess.error) {
      return sendError(res, destinationAccess.error.status, destinationAccess.error.message);
    }
    if (destinationAccess.project?.status === "Completed") {
      return sendError(res, 400, "Inventory is locked for completed projects");
    }
    if (!["in_transit", "partially_received"].includes(transfer.status)) {
      return sendError(res, 400, "Only dispatched transfers can be received");
    }
    const requestedLines = resolveReceiptLines(transfer, req.body.items);
    if (requestedLines.error) return sendError(res, 400, requestedLines.error);
    const lines = allocateTransferReceiptCosts(transfer, requestedLines);
    if (lines.error) return sendError(res, 400, lines.error);
    const materials = await InventoryMaterial.find({
      _id: { $in: lines.map((line) => line.materialId) },
      organizationId: req.user.organizationId
    });
    const materialById = new Map(materials.map((material) => [String(material._id), material]));
    let indent;
    if (transfer.indentId) {
      indent = await InventoryIndent.findOne({
        _id: transfer.indentId,
        organizationId: req.user.organizationId
      });
      if (!indent) return sendError(res, 409, "The transfer's indent no longer exists");
      for (const line of lines) {
        const indentItem = indent.items.find(
          (item) => String(item.materialId) === String(line.materialId)
        );
        if (!indentItem || indentItem.fulfilledQuantity + line.quantity > indentItem.requestedQuantity) {
          return sendError(res, 409, "Received quantity exceeds the remaining indent quantity");
        }
      }
    }

    const changedItems = [];
    const receivedItems = [];
    const previousIndentStatus = indent?.status;
    const previousIndentQuantities = indent?.items.map((item) => ({
      fulfilledQuantity: item.fulfilledQuantity,
      allocatedQuantity: item.allocatedQuantity
    }));
    const rollbackStock = () => Promise.all(changedItems.map(({ itemId, created, previousStock }) => (
      created
        ? InventoryItem.deleteOne({ _id: itemId })
        : InventoryItem.updateOne(
          { _id: itemId },
          { $set: previousStock }
        )
    )));

    try {
      for (const line of lines) {
        const transferItem = transfer.items.find(
          (item) => String(item.materialId) === String(line.materialId)
        );
        const material = materialById.get(String(line.materialId));
        if (!material) throw new Error("A transfer material no longer exists");
        const existingStock = await findStockItem(destinationAccess.location, material);
        const previousStock = existingStock && {
          totalQuantity: existingStock.totalQuantity,
          availableQuantity: existingStock.availableQuantity,
          pricePerUnit: existingStock.pricePerUnit,
          supplierName: existingStock.supplierName,
          companyName: existingStock.companyName
        };
        const stock = await addStock({
          location: destinationAccess.location,
          material,
          quantity: line.quantity,
          unitCost: line.unitCost,
          userId: req.user.User_id
        });
        changedItems.push({
          itemId: stock._id,
          quantity: line.quantity,
          created: !existingStock,
          previousStock,
          item: stock
        });
        receivedItems.push(stock);
        transferItem.receivedQuantity += line.quantity;
        for (const allocation of line.allocations) {
          transfer.dispatches[allocation.dispatchIndex].items[allocation.itemIndex].receivedQuantity +=
            allocation.quantity;
        }
      }
    } catch (error) {
      await rollbackStock();
      return sendError(res, 409, error.message);
    }

    transfer.receipts.push({
      receivedBy: req.user.User_id,
      items: lines.map((line, index) => ({
        materialId: line.materialId,
        inventoryItemId: receivedItems[index]._id,
        quantity: line.quantity,
        unitCost: line.unitCost
      })),
      notes: typeof req.body.notes === "string" ? req.body.notes.trim() : ""
    });
    transfer.receivedBy = req.user.User_id;
    const fullyReceived = transfer.items.every(
      (item) => item.receivedQuantity >= item.requestedQuantity
    );
    const partlyReceived = transfer.items.some((item) => item.receivedQuantity > 0);
    transfer.status = fullyReceived ? "received" : partlyReceived ? "partially_received" : "in_transit";
    try {
      if (indent) await addIndentFulfillment(indent, lines);
      await transfer.save();
    } catch (error) {
      const rollbackErrors = [];
      try {
        await rollbackStock();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
      if (indent) {
        indent.status = previousIndentStatus;
        indent.items.forEach((item, index) => {
          item.fulfilledQuantity = previousIndentQuantities[index].fulfilledQuantity;
          item.allocatedQuantity = previousIndentQuantities[index].allocatedQuantity;
        });
        try {
          await indent.save();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length) {
        console.error("Transfer receipt rollback failed", rollbackErrors);
      }
      return sendError(res, 500, error.message);
    }
    if (indent) emitIndentUpdate(req, destinationAccess.location, indent, "transfer_received");
    const io = req.app.get("io");
    if (io && destinationAccess.location.projectId) {
      for (const item of receivedItems) {
        io.to(`project-${destinationAccess.location.projectId}`).emit("inventory:item-added", {
          item: {
            ...item.toObject(),
            isLowStock: item.availableQuantity <= item.totalQuantity * 0.2
          }
        });
      }
    }
    return res.status(200).json({ success: true, transfer });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createPurchaseOrder = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const result = await accessibleIndent(req.body.indentId, req.user);
    if (result.error) return sendError(res, result.error.status, result.error.message);
    const orderResult = await createPurchaseOrder({
      indent: result.indent,
      location: result.location,
      user: req.user,
      vendorId: req.body.vendorId,
      body: req.body
    });
    if (orderResult.error) {
      return sendError(res, orderResult.error.status, orderResult.error.message);
    }
    emitIndentUpdate(req, result.location, result.indent, "purchase_order_created");
    return res.status(201).json({ success: true, purchaseOrder: orderResult.purchaseOrder });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listPurchaseOrders = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status) {
      const statuses = ["issued", "partially_received", "received", "cancelled"];
      if (!statuses.includes(req.query.status)) return sendError(res, 400, "Invalid purchase order status");
      filter.status = req.query.status;
    }
    if (req.user.role === "Site Engineer" && !req.query.locationId) {
      return sendError(res, 400, "locationId is required");
    }
    if (req.query.locationId) {
      const access = await getAccessibleLocation(req.query.locationId, req.user);
      if (access.error) return sendError(res, access.error.status, access.error.message);
      filter.locationId = access.location._id;
    }
    const purchaseOrders = await InventoryPurchaseOrder.find(filter)
      .populate("locationId", "name type projectId")
      .populate("vendorId", "name contactName email phone taxId address")
      .populate("indentId", "status")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, purchaseOrders });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getPurchaseOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.purchaseOrderId)) {
      return sendError(res, 400, "Invalid purchase order ID");
    }
    const purchaseOrder = await InventoryPurchaseOrder.findOne({
      _id: req.params.purchaseOrderId,
      organizationId: req.user.organizationId
    });
    if (!purchaseOrder) return sendError(res, 404, "Purchase order not found");
    const locationAccess = await getAccessibleLocation(purchaseOrder.locationId, req.user);
    if (locationAccess.error) {
      return sendError(res, locationAccess.error.status, locationAccess.error.message);
    }
    await purchaseOrder.populate("locationId", "name type projectId");
    await purchaseOrder.populate("vendorId", "name contactName email phone taxId address");
    await purchaseOrder.populate("indentId", "status");
    return res.status(200).json({ success: true, purchaseOrder });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.cancelPurchaseOrder = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.purchaseOrderId)) {
      return sendError(res, 400, "Invalid purchase order ID");
    }
    const purchaseOrder = await InventoryPurchaseOrder.findOne({
      _id: req.params.purchaseOrderId,
      organizationId: req.user.organizationId
    });
    if (!purchaseOrder) return sendError(res, 404, "Purchase order not found");
    const locationAccess = await getAccessibleLocation(purchaseOrder.locationId, req.user);
    if (locationAccess.error) {
      return sendError(res, locationAccess.error.status, locationAccess.error.message);
    }
    if (purchaseOrder.status !== "issued") {
      return sendError(res, 400, "Only purchase orders with no receipts can be cancelled");
    }
    purchaseOrder.status = "cancelled";
    await purchaseOrder.save();
    if (purchaseOrder.indentId) {
      const indent = await InventoryIndent.findById(purchaseOrder.indentId);
      if (indent) {
        for (const line of purchaseOrder.items) {
          const indentItem = indent.items.find(
            (item) => String(item.materialId) === String(line.materialId)
          );
          if (indentItem) {
            indentItem.allocatedQuantity = Math.max(
              0,
              indentItem.allocatedQuantity - line.orderedQuantity
            );
          }
        }
        await indent.save();
        emitIndentUpdate(req, locationAccess.location, indent, "purchase_order_cancelled");
      }
    }
    return res.status(200).json({ success: true, purchaseOrder });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.createGoodsReceipt = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const { purchaseOrderId, receivedDate, items, notes = "" } = req.body;
    if (!mongoose.isValidObjectId(purchaseOrderId)) {
      return sendError(res, 400, "A valid purchase order is required");
    }
    if (!isDateOnly(receivedDate)) return sendError(res, 400, "Received date must be YYYY-MM-DD");
    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, "At least one received item is required");
    }
    if (typeof notes !== "string") return sendError(res, 400, "Notes must be a string");

    const purchaseOrder = await InventoryPurchaseOrder.findOne({
      _id: purchaseOrderId,
      organizationId: req.user.organizationId
    });
    if (!purchaseOrder) return sendError(res, 404, "Purchase order not found");
    if (!["issued", "partially_received"].includes(purchaseOrder.status)) {
      return sendError(res, 400, "This purchase order cannot receive additional goods");
    }
    const locationAccess = await getAccessibleLocation(purchaseOrder.locationId, req.user);
    if (locationAccess.error) {
      return sendError(res, locationAccess.error.status, locationAccess.error.message);
    }
    if (locationAccess.project?.status === "Completed") {
      return sendError(res, 400, "Inventory is locked for completed projects");
    }

    const seen = new Set();
    const receiptItems = [];
    for (const line of items) {
      const materialId = String(line?.materialId);
      const quantity = Number(line?.receivedQuantity);
      const orderItem = purchaseOrder.items.find(
        (item) => String(item.materialId) === materialId
      );
      if (
        !mongoose.isValidObjectId(line?.materialId) ||
        !isPositiveNumber(quantity) ||
        seen.has(materialId) ||
        !orderItem ||
        quantity > orderItem.orderedQuantity - orderItem.receivedQuantity
      ) {
        return sendError(res, 400, "Received quantities must be positive and cannot exceed the open purchase order quantities");
      }
      seen.add(materialId);
      receiptItems.push({
        materialId: orderItem.materialId,
        materialName: orderItem.materialName,
        unit: orderItem.unit,
        receivedQuantity: quantity,
        unitPrice: orderItem.unitPrice
      });
    }

    let indent;
    if (purchaseOrder.indentId) {
      indent = await InventoryIndent.findOne({
        _id: purchaseOrder.indentId,
        organizationId: req.user.organizationId
      });
      if (!indent) return sendError(res, 409, "The purchase order's indent no longer exists");
      for (const line of receiptItems) {
        const indentItem = indent.items.find(
          (item) => String(item.materialId) === String(line.materialId)
        );
        if (!indentItem || indentItem.fulfilledQuantity + line.receivedQuantity > indentItem.requestedQuantity) {
          return sendError(res, 409, "Received quantities exceed the remaining indent quantities");
        }
      }
    }

    const materials = await InventoryMaterial.find({
      _id: { $in: receiptItems.map((item) => item.materialId) },
      organizationId: req.user.organizationId
    });
    const materialById = new Map(materials.map((material) => [String(material._id), material]));
    if (materialById.size !== receiptItems.length) {
      return sendError(res, 409, "A purchase order material no longer exists");
    }

    const receipt = await InventoryGoodsReceipt.create({
      organizationId: req.user.organizationId,
      purchaseOrderId: purchaseOrder._id,
      locationId: purchaseOrder.locationId,
      receivedBy: req.user.User_id,
      receivedDate,
      items: receiptItems,
      notes: notes.trim()
    });

    const receivedStock = [];
    const stockChanges = [];
    const previousOrderStatus = purchaseOrder.status;
    const previousOrderQuantities = purchaseOrder.items.map((item) => item.receivedQuantity);
    const previousIndentStatus = indent?.status;
    const previousIndentQuantities = indent?.items.map((item) => ({
      fulfilledQuantity: item.fulfilledQuantity,
      allocatedQuantity: item.allocatedQuantity
    }));

    try {
      for (const line of receiptItems) {
        const material = materialById.get(String(line.materialId));
        const existingStock = await findStockItem(locationAccess.location, material);
        const previousStock = existingStock && {
          totalQuantity: existingStock.totalQuantity,
          availableQuantity: existingStock.availableQuantity,
          pricePerUnit: existingStock.pricePerUnit,
          supplierName: existingStock.supplierName,
          companyName: existingStock.companyName
        };
        const item = await addStock({
          location: locationAccess.location,
          material,
          quantity: line.receivedQuantity,
          unitCost: line.unitPrice,
          userId: req.user.User_id,
          supplierName: purchaseOrder.vendorSnapshot.contactName || purchaseOrder.vendorSnapshot.name,
          companyName: purchaseOrder.vendorSnapshot.name
        });
        stockChanges.push({
          itemId: item._id,
          created: !existingStock,
          previousStock
        });
        receivedStock.push(item);
        await InventoryPurchase.create({
          projectId: locationAccess.location.projectId || null,
          locationId: locationAccess.location._id,
          organizationId: req.user.organizationId,
          materialId: line.materialId,
          inventoryItemId: item._id,
          purchaseOrderId: purchaseOrder._id,
          goodsReceiptId: receipt._id,
          purchaseDate: receivedDate,
          quantity: line.receivedQuantity,
          pricePerUnit: line.unitPrice,
          supplierName: purchaseOrder.vendorSnapshot.contactName || purchaseOrder.vendorSnapshot.name,
          companyName: purchaseOrder.vendorSnapshot.name,
          createdBy: req.user.User_id
        });
        const orderItem = purchaseOrder.items.find(
          (candidate) => String(candidate.materialId) === String(line.materialId)
        );
        orderItem.receivedQuantity += line.receivedQuantity;
      }

      purchaseOrder.status = purchaseOrder.items.every(
        (item) => item.receivedQuantity >= item.orderedQuantity
      ) ? "received" : "partially_received";
      await purchaseOrder.save();
      if (indent) await addIndentFulfillment(indent, receiptItems.map((item) => ({
        materialId: item.materialId,
        quantity: item.receivedQuantity
      })));
    } catch (error) {
      const rollbackErrors = [];
      const rollbacks = [
        InventoryPurchase.deleteMany({ goodsReceiptId: receipt._id }),
        InventoryGoodsReceipt.deleteOne({ _id: receipt._id }),
        ...stockChanges.map(({ itemId, created, previousStock }) => (
          created
            ? InventoryItem.deleteOne({ _id: itemId })
            : InventoryItem.updateOne({ _id: itemId }, { $set: previousStock })
        ))
      ];
      await Promise.all(rollbacks.map((rollback) =>
        rollback.catch((rollbackError) => rollbackErrors.push(rollbackError))
      ));

      purchaseOrder.status = previousOrderStatus;
      purchaseOrder.items.forEach((item, index) => {
        item.receivedQuantity = previousOrderQuantities[index];
      });
      try {
        await purchaseOrder.save();
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }

      if (indent) {
        indent.status = previousIndentStatus;
        indent.items.forEach((item, index) => {
          item.fulfilledQuantity = previousIndentQuantities[index].fulfilledQuantity;
          item.allocatedQuantity = previousIndentQuantities[index].allocatedQuantity;
        });
        try {
          await indent.save();
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length) {
        console.error("Goods receipt rollback failed", rollbackErrors);
      }
      throw error;
    }
    if (indent) emitIndentUpdate(req, locationAccess.location, indent, "goods_received");
    const io = req.app.get("io");
    if (io && locationAccess.location.projectId) {
      for (const item of receivedStock) {
        io.to(`project-${locationAccess.location.projectId}`).emit("inventory:item-added", {
          item: {
            ...item.toObject(),
            isLowStock: item.availableQuantity <= item.totalQuantity * 0.2
          }
        });
      }
    }
    return res.status(201).json({ success: true, receipt, purchaseOrder });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.listGoodsReceipts = async (req, res) => {
  try {
    if (!isAllowedOperator(req.user)) return sendError(res, 403, "You are not authorized");
    const filter = { organizationId: req.user.organizationId };
    if (req.query.purchaseOrderId) {
      if (!mongoose.isValidObjectId(req.query.purchaseOrderId)) {
        return sendError(res, 400, "Invalid purchase order ID");
      }
      const purchaseOrder = await InventoryPurchaseOrder.findOne({
        _id: req.query.purchaseOrderId,
        organizationId: req.user.organizationId
      });
      if (!purchaseOrder) return sendError(res, 404, "Purchase order not found");
      const locationAccess = await getAccessibleLocation(purchaseOrder.locationId, req.user);
      if (locationAccess.error) {
        return sendError(res, locationAccess.error.status, locationAccess.error.message);
      }
      filter.purchaseOrderId = purchaseOrder._id;
    } else if (req.query.locationId) {
      const locationAccess = await getAccessibleLocation(req.query.locationId, req.user);
      if (locationAccess.error) {
        return sendError(res, locationAccess.error.status, locationAccess.error.message);
      }
      filter.locationId = locationAccess.location._id;
    } else if (req.user.role === "Site Engineer") {
      return sendError(res, 400, "locationId or purchaseOrderId is required");
    }
    const receipts = await InventoryGoodsReceipt.find(filter)
      .populate("purchaseOrderId", "status totalAmount")
      .populate("locationId", "name type projectId")
      .populate("receivedBy", "name")
      .sort({ receivedDate: -1 });
    return res.status(200).json({ success: true, receipts });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};

exports.getGoodsReceipt = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.receiptId)) {
      return sendError(res, 400, "Invalid goods receipt ID");
    }
    const receipt = await InventoryGoodsReceipt.findOne({
      _id: req.params.receiptId,
      organizationId: req.user.organizationId
    });
    if (!receipt) return sendError(res, 404, "Goods receipt not found");
    const locationAccess = await getAccessibleLocation(receipt.locationId, req.user);
    if (locationAccess.error) {
      return sendError(res, locationAccess.error.status, locationAccess.error.message);
    }
    await receipt.populate("purchaseOrderId", "status totalAmount vendorSnapshot");
    await receipt.populate("locationId", "name type projectId");
    await receipt.populate("receivedBy", "name");
    return res.status(200).json({ success: true, receipt });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, error.message);
  }
};
