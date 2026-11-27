const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    projectId:{
        type:Schema.Types.ObjectId,
        ref:'Project'
    },
    conversationId: { type: Schema.Types.ObjectId, ref: "ChatConversation", default: null },
    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organization",
        required: true
    },
    senderId:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    message:{
        type:String,
        default:""
    },
    attachments: [{
        kind: { type: String, enum: ["image", "video", "audio", "file"], required: true },
        originalName: { type: String, trim: true, maxlength: 255, required: true },
        mimeType: { type: String, required: true },
        sizeBytes: { type: Number, min: 0, required: true },
        key: { type: String, required: true },
        sourceAssetId: { type: Schema.Types.ObjectId, ref: "Asset", default: null }
    }],
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
},{
    timestamps:true
});

messageSchema.index({ projectId: 1, organizationId: 1, conversationId: 1, createdAt: -1, _id: -1 });

const Message = mongoose.model('Message',messageSchema);
module.exports = Message;
