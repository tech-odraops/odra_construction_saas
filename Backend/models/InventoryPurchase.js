const mongoose = require("mongoose");

const inventoryPurchaseSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryLocation",
      default: null
    },

    materialId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryMaterial",
      default: null
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

    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryPurchaseOrder"
    },

    goodsReceiptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryGoodsReceipt"
    },

    purchaseDate: {
      type: Date,
      required: true
    },

    quantity: {
      type: Number,
      required: true
    },

    pricePerUnit: {
      type: Number,
      required: true
    },

    supplierName: {
      type: String,
      required: true
    },

    companyName: {
      type: String,
      required: true
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model(
  "InventoryPurchase",
  inventoryPurchaseSchema
);