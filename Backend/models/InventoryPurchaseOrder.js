const mongoose = require("mongoose");

const inventoryPurchaseOrderSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    indentId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryIndent" },
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      required: true
    },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryVendor", required: true },
    vendorSnapshot: {
      name: { type: String, required: true },
      contactName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      taxId: { type: String, default: "" },
      address: { type: String, default: "" }
    },
    items: [{
      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "InventoryMaterial",
        required: true
      },
      materialName: { type: String, required: true },
      unit: { type: String, required: true },
      orderedQuantity: { type: Number, required: true, min: 0.000001 },
      receivedQuantity: { type: Number, default: 0, min: 0 },
      unitPrice: { type: Number, required: true, min: 0 },
      taxRate: { type: Number, default: 0, min: 0 },
      taxAmount: { type: Number, default: 0, min: 0 },
      lineTotal: { type: Number, required: true, min: 0 }
    }],
    deliveryDate: { type: Date },
    shippingCost: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["issued", "partially_received", "received", "cancelled"],
      default: "issued"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

inventoryPurchaseOrderSchema.index({ organizationId: 1, locationId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryPurchaseOrder", inventoryPurchaseOrderSchema);
