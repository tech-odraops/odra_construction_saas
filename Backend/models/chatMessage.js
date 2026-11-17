const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    projectId:{
        type:Schema.Types.ObjectId,
        ref:'Project'
    },
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
        required:true
    },
    readBy: [{
        type: Schema.Types.ObjectId,
        ref: "User"
    }]
},{
    timestamps:true
});

const Message = mongoose.model('Message',messageSchema);
module.exports = Message;