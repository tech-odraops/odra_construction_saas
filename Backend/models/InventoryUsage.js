const mongoose = require("mongoose");

const inventoryUsageSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation"
    },
    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryMaterial"
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    inventoryItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryItem",
      required: true
    },
    usedQty: {
      type: Number,
      required: true
    },

    // 🆕 COST SNAPSHOT
    costAtThatTime: {
      type: Number,
      required: true
    },

    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    date: {
      type: String,
      required: true
    },
    comment: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryUsage", inventoryUsageSchema);
