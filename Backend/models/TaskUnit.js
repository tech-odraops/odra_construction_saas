
const mongoose = require("mongoose");
const { Schema } = mongoose;

const taskUnitSchema = new Schema(
    {
        organizationId: {
            type: Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        abbreviation: {
            type: String,
            required: true,
            trim: true
        },

        description: {
            type: String,
            trim: true,
            default: ""
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

// Prevent duplicate unit names and abbreviations within an organization.
taskUnitSchema.index(
    { organizationId: 1, name: 1 },
    { unique: true }
);

taskUnitSchema.index(
    { organizationId: 1, abbreviation: 1 },
    { unique: true }
);

module.exports = mongoose.model("TaskUnit", taskUnitSchema);
