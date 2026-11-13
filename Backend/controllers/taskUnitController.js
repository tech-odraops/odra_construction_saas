
const TaskUnit = require("../models/TaskUnit");
const Task = require("../models/Task");

// CREATE TASK UNIT
exports.createTaskUnit = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const userId = req.user.User_id;

        const { name, abbreviation, description } = req.body;

        const unit = await TaskUnit.create({
            organizationId,
            createdBy: userId,
            name,
            abbreviation,
            description
        });

        return res.status(201).json({
            success: true,
            message: "Task unit created successfully.",
            unit
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A unit with this name or abbreviation already exists."
            });
        }

        console.error("Create Task Unit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create task unit."
        });
    }
};


// GET ALL TASK UNITS
exports.getTaskUnits = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;

        const units = await TaskUnit.find({
            organizationId
        })
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: units.length,
            units
        });

    } catch (error) {
        console.error("Get Task Units Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch task units."
        });
    }
};


// UPDATE TASK UNIT
exports.updateTaskUnit = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { id } = req.params;

        const allowedFields = [
            "name",
            "abbreviation",
            "description",
            "isActive"
        ];

        const updateData = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one valid field is required for updating."
            });
        }

        const unit = await TaskUnit.findOneAndUpdate(
            {
                _id: id,
                organizationId
            },
            {
                $set: updateData
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!unit) {
            return res.status(404).json({
                success: false,
                message: "Task unit not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task unit updated successfully.",
            unit
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A unit with this name or abbreviation already exists."
            });
        }

        console.error("Update Task Unit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update task unit."
        });
    }
};


// DELETE TASK UNIT
exports.deleteTaskUnit = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { id } = req.params;

        const unit = await TaskUnit.findOne({
            _id: id,
            organizationId
        });

        if (!unit) {
            return res.status(404).json({
                success: false,
                message: "Task unit not found."
            });
        }

        // Prevent deletion if any task currently uses this unit.
        const unitInUse = await Task.exists({
            progressUnitId: unit._id,
            organizationId
        });

        if (unitInUse) {
            return res.status(409).json({
                success: false,
                message: "This unit is currently used by one or more tasks. Reassign those tasks before deleting it."
            });
        }

        await TaskUnit.deleteOne({
            _id: unit._id,
            organizationId
        });

        return res.status(200).json({
            success: true,
            message: "Task unit deleted successfully."
        });

    } catch (error) {
        console.error("Delete Task Unit Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete task unit."
        });
    }
};
