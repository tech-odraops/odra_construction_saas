const mongoose = require("mongoose");

const inventoryMaterialSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
    normalizedUnit: { type: String, required: true, trim: true, lowercase: true },
    specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

inventoryMaterialSchema.index(
  { organizationId: 1, normalizedName: 1, normalizedUnit: 1 },
  { unique: true }
);

module.exports = mongoose.model("InventoryMaterial", inventoryMaterialSchema);
