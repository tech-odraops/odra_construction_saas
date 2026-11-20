const mongoose = require("mongoose");

const inventoryGoodsReceiptSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryPurchaseOrder",
      required: true
    },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      required: true
    },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receivedDate: { type: Date, required: true },
    items: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryMaterial",
        required: true
      },
      materialName: { type: String, required: true },
      unit: { type: String, required: true },
      receivedQuantity: { type: Number, required: true, min: 0.000001 },
      unitPrice: { type: Number, required: true, min: 0 }
    }],
    notes: { type: String, trim: true, default: "" }
  },
  { timestamps: true }
);

inventoryGoodsReceiptSchema.index({ organizationId: 1, purchaseOrderId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryGoodsReceipt", inventoryGoodsReceiptSchema);
