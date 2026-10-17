
const mongoose = require("mongoose");

const passwordResetTokenSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        tokenHash: {
            type: String,
            required: true,
            unique: true,
            select: false
        },
        expiresAt: {
            type: Date,
            required: true
        },
        usedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Automatically remove expired reset-token records.
passwordResetTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
    "PasswordResetToken",
    passwordResetTokenSchema
);
