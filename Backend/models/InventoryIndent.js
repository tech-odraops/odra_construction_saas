const mongoose = require("mongoose");

const inventoryIndentSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      required: true
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryMaterial",
        required: true
      },
      materialName: { type: String, required: true },
      unit: { type: String, required: true },
      requestedQuantity: { type: Number, required: true, min: 0.000001 },
      fulfilledQuantity: { type: Number, default: 0, min: 0 },
      allocatedQuantity: { type: Number, default: 0, min: 0 }
    }],
    transferIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "InventoryTransfer" }],
    purchaseOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "InventoryPurchaseOrder" }],
    requiredDate: { type: Date },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["submitted", "sourcing", "partially_fulfilled", "fulfilled", "rejected", "cancelled"],
      default: "submitted"
    }
  },
  { timestamps: true }
);

inventoryIndentSchema.index({ organizationId: 1, locationId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryIndent", inventoryIndentSchema);
