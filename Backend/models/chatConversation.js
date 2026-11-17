const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  creationKey: { type: String, select: false },
}, { timestamps: true });

chatConversationSchema.index({ projectId: 1, organizationId: 1, createdAt: -1 });
chatConversationSchema.index({ creationKey: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model("ChatConversation", chatConversationSchema);
