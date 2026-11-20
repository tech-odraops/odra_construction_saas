const mongoose = require("mongoose");

const inventoryTransferSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    indentId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryIndent" },
    sourceLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      required: true
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      required: true
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    items: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryMaterial",
        required: true
      },
      materialName: { type: String, required: true },
      unit: { type: String, required: true },
      requestedQuantity: { type: Number, required: true, min: 0.000001 },
      dispatchedQuantity: { type: Number, default: 0, min: 0 },
      receivedQuantity: { type: Number, default: 0, min: 0 },
      unitCost: { type: Number, default: 0, min: 0 }
    }],
    dispatches: [{
      dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      dispatchedAt: { type: Date, default: Date.now },
      items: [{
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryMaterial", required: true },
        quantity: { type: Number, required: true, min: 0.000001 },
        unitCost: { type: Number, required: true, min: 0 },
        receivedQuantity: { type: Number, default: 0, min: 0 }
      }]
    }],
    receipts: [{
      receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      receivedAt: { type: Date, default: Date.now },
      items: [{
        materialId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryMaterial", required: true },
        inventoryItemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem" },
        quantity: { type: Number, required: true, min: 0.000001 },
        unitCost: { type: Number, required: true, min: 0 }
      }],
      notes: { type: String, trim: true, default: "" }
    }],
    status: {
      type: String,
      enum: ["requested", "approved", "in_transit", "partially_received", "received", "rejected", "cancelled"],
      default: "requested"
    },
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

inventoryTransferSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryTransfer", inventoryTransferSchema);
