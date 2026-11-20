const InventoryItem = require("../models/inventoryItem");
const InventoryUsage = require("../models/InventoryUsage");
const InventoryPurchase = require("../models/InventoryPurchase");
const InventoryMaterial = require("../models/InventoryMaterial");
const InventoryTransfer = require("../models/InventoryTransfer");
const mongoose = require("mongoose");
const {
  getAuthorizedProject,
  getProjectLocation
} = require("../utils/inventoryWorkflow");
const { isDateOnly: isValidDateOnly } = require("../utils/inventoryWorkflowRules");

const getInventorySnapshot = async (projectId, organizationId, locationId) => {
  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const filter = { projectId: projectObjectId, organizationId: organizationObjectId };

  const [items, purchases, usages, transfers] = await Promise.all([
    InventoryItem.find(filter)
      .populate({
        path: "projectId",
        select: "title contractor",
        populate: { path: "contractor", select: "name" }
      })
      .lean(),
    InventoryPurchase.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$inventoryItemId",
          totalPurchasedValue: {
            $sum: { $multiply: ["$quantity", "$pricePerUnit"] }
          }
        }
      }
    ]),
    InventoryUsage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$inventoryItemId",
          totalUsedCost: { $sum: "$costAtThatTime" }
        }
      }
    ]),
    InventoryTransfer.aggregate([
      {
        $match: {
          organizationId: organizationObjectId,
          destinationLocationId: new mongoose.Types.ObjectId(String(locationId))
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

  const purchasesByItem = new Map(
    purchases.map((purchase) => [String(purchase._id), purchase.totalPurchasedValue])
  );
  const usagesByItem = new Map(
    usages.map((usage) => [String(usage._id), usage.totalUsedCost])
  );
  const transfersByItem = new Map(
    transfers.map((transfer) => [String(transfer._id), transfer.transferredInValue])
  );

  const valuedItems = items.map((item) => {
    const key = String(item._id);
    const totalPurchasedValue = purchasesByItem.has(key)
      ? purchasesByItem.get(key)
      : transfersByItem.has(key)
        ? 0
        : item.totalQuantity * item.pricePerUnit;
    const totalUsedCost = usagesByItem.get(key) || 0;
    const remainingStockValue = item.availableQuantity * item.pricePerUnit;

    return {
      ...item,
      isLowStock: item.availableQuantity <= item.totalQuantity * 0.2,
      totalPurchasedValue,
      transferredInValue: transfersByItem.get(key) || 0,
      totalUsedCost,
      remainingStockValue
    };
  });

  const totalPurchasedValue =
    [...purchasesByItem.values()].reduce((total, value) => total + value, 0) +
    items.reduce((total, item) => {
      const key = String(item._id);
      return total + (purchasesByItem.has(key) || transfersByItem.has(key)
        ? 0
        : item.totalQuantity * item.pricePerUnit);
    }, 0);

  return {
    items: valuedItems,
    summary: {
      totalPurchasedValue,
      totalUsedCost: [...usagesByItem.values()].reduce((total, value) => total + value, 0),
      remainingStockValue: valuedItems.reduce((total, item) => total + item.remainingStockValue, 0)
    }
  };
};

/* --------------------------------
   Add material to project
--------------------------------- */
exports.addInventoryItem = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      unit,
      quantity,
      pricePerUnit,
      supplierName,
      companyName,
      purchaseDate
    } = req.body;
    const qty = Number(quantity);
    const price = Number(pricePerUnit);

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof unit !== "string" ||
      !unit.trim() ||
      typeof supplierName !== "string" ||
      !supplierName.trim() ||
      typeof companyName !== "string" ||
      !companyName.trim() ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      pricePerUnit === "" ||
      pricePerUnit == null ||
      !Number.isFinite(price) ||
      price < 0 ||
      !isValidDateOnly(purchaseDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a material, unit, supplier, company, positive quantity, valid price, and purchase date"
      });
    }

    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }
    const project = access.project;

    if (project.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Inventory is locked for completed projects"
      });
    }

    const location = await getProjectLocation(project);
    const normalizedName = name.trim().toLowerCase();
    const normalizedUnit = unit.trim().toLowerCase();
    const material = await InventoryMaterial.findOne({
      organizationId: req.user.organizationId,
      normalizedName,
      normalizedUnit
    });
    let item = await InventoryItem.findOne({
      projectId,
      organizationId: req.user.organizationId,
      name: normalizedName,
      unit: normalizedUnit
    });
    const previousItem = item && {
      totalQuantity: item.totalQuantity,
      availableQuantity: item.availableQuantity,
      pricePerUnit: item.pricePerUnit,
      supplierName: item.supplierName,
      companyName: item.companyName,
      locationId: item.locationId,
      materialId: item.materialId
    };

    if (item) {
      const newAvailableQuantity = item.availableQuantity + qty;
      item.pricePerUnit =
        (item.availableQuantity * item.pricePerUnit + qty * price) / newAvailableQuantity;
      item.totalQuantity += qty;
      item.availableQuantity = newAvailableQuantity;
      item.supplierName = supplierName.trim();
      item.companyName = companyName.trim();
      item.locationId = location._id;
      if (material) item.materialId = material._id;
      await item.save();
    } else {
      item = await InventoryItem.create({
        projectId,
        locationId: location._id,
        materialId: material?._id || null,
        organizationId: req.user.organizationId,
        name: normalizedName,
        supplierName: supplierName.trim(),
        companyName: companyName.trim(),
        unit: normalizedUnit,
        pricePerUnit: price,
        totalQuantity: qty,
        availableQuantity: qty,
        createdBy: req.user.User_id
      });
    }

    try {
      await InventoryPurchase.create({
        projectId,
        locationId: location._id,
        materialId: material?._id || null,
        organizationId: req.user.organizationId,
        inventoryItemId: item._id,
        purchaseDate,
        quantity: qty,
        pricePerUnit: price,
        supplierName: supplierName.trim(),
        companyName: companyName.trim(),
        createdBy: req.user.User_id
      });
    } catch (error) {
      if (previousItem) {
        await InventoryItem.updateOne({ _id: item._id }, { $set: previousItem });
      } else {
        await InventoryItem.deleteOne({ _id: item._id });
      }
      throw error;
    }

    const inventoryItem = {
      ...item.toObject(),
      isLowStock: item.availableQuantity <= item.totalQuantity * 0.2
    };
    const io = req.app.get("io");
    if (io) {
      io.to(`project-${projectId}`).emit("inventory:item-added", {
        item: inventoryItem
      });
    }

    return res.status(200).json({
      success: true,
      item: inventoryItem
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* --------------------------------
   Get project inventory
--------------------------------- */
exports.getProjectInventory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }

    const location = await getProjectLocation(access.project);
    const inventory = await getInventorySnapshot(
      projectId,
      req.user.organizationId,
      location._id
    );
    return res.status(200).json({
      success: true,
      items: inventory.items
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* --------------------------------
   Record inventory usage
--------------------------------- */
exports.logInventoryUsage = async (req, res) => {
  try {
    const { projectId, inventoryItemId, usedQty, date } = req.body;
    const quantity = Number(usedQty);
    if (
      !mongoose.isValidObjectId(projectId) ||
      !mongoose.isValidObjectId(inventoryItemId) ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !isValidDateOnly(date)
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid project, material, positive quantity, and usage date"
      });
    }

    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }
    const project = access.project;

    if (project.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Inventory is locked for completed projects"
      });
    }

    const item = await InventoryItem.findOneAndUpdate(
      {
        _id: inventoryItemId,
        projectId: project._id,
        organizationId: req.user.organizationId,
        availableQuantity: { $gte: quantity }
      },
      { $inc: { availableQuantity: -quantity } },
      { new: true, runValidators: true }
    );
    if (!item) {
      const existingItem = await InventoryItem.exists({
        _id: inventoryItemId,
        projectId: project._id,
        organizationId: req.user.organizationId
      });
      return res.status(existingItem ? 400 : 404).json({
        success: false,
        message: existingItem
          ? "Used quantity exceeds available stock"
          : "Inventory item not found"
      });
    }

    try {
      await InventoryUsage.create({
        projectId,
        locationId: item.locationId,
        materialId: item.materialId,
        inventoryItemId,
        organizationId: req.user.organizationId,
        usedQty: quantity,
        costAtThatTime: quantity * item.pricePerUnit,
        usedBy: req.user.User_id,
        date
      });
    } catch (error) {
      await InventoryItem.updateOne(
        { _id: item._id, projectId: project._id, organizationId: req.user.organizationId },
        { $inc: { availableQuantity: quantity } }
      );
      throw error;
    }

    const isLowStock = item.availableQuantity <= item.totalQuantity * 0.2;
    const io = req.app.get("io");
    if (io) {
      io.to(`project-${projectId}`).emit("inventory:updated", {
        inventoryItemId,
        availableQuantity: item.availableQuantity,
        updatedBy: req.user.User_id,
        isLowStock
      });
    }

    return res.status(201).json({
      success: true,
      message: "Inventory usage recorded"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* --------------------------------
   Get inventory usage history
--------------------------------- */
exports.getInventoryUsageHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }

    const history = await InventoryUsage.find({ projectId, organizationId: req.user.organizationId })
      .populate("inventoryItemId", "name unit")
      .populate("usedBy", "name")
      .sort({ date: -1 });

    return res.status(200).json({
      success: true,
      history
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


/* --------------------------------
   Get project cost summary
--------------------------------- */
exports.getInventorySummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }
    const location = await getProjectLocation(access.project);
    const inventory = await getInventorySnapshot(
      projectId,
      req.user.organizationId,
      location._id
    );
    return res.status(200).json({ success: true, ...inventory.summary });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

/* --------------------------------
   Get inventory purchase history
--------------------------------- */
exports.getInventoryPurchaseHistory = async (req, res) => {
  try {
    const { projectId } = req.params;
    const access = await getAuthorizedProject(projectId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({
        success: false,
        message: access.error.message
      });
    }
    const history = await InventoryPurchase.find({
      projectId,
      organizationId: req.user.organizationId
    })
      .populate("inventoryItemId", "name unit")
      .populate("createdBy", "name")
      .sort({ purchaseDate: -1 });

    return res.status(200).json({
      success: true,
      history
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};