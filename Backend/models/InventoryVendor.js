const mongoose = require("mongoose");

const inventoryVendorSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    name: { type: String, required: true, trim: true },
    contactName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    taxId: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

inventoryVendorSchema.index({ organizationId: 1, name: 1 });

module.exports = mongoose.model("InventoryVendor", inventoryVendorSchema);
