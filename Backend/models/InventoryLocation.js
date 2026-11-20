const mongoose = require("mongoose");

const inventoryLocationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true
    },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["project_site", "warehouse"],
      required: true
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    code: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

inventoryLocationSchema.index(
  { organizationId: 1, projectId: 1 },
  {
    unique: true,
    partialFilterExpression: { type: "project_site", projectId: { $exists: true } }
  }
);

module.exports = mongoose.model("InventoryLocation", inventoryLocationSchema);
