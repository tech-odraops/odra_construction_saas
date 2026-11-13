
const TaskCategory = require("../models/TaskCategory");
const Task = require("../models/Task");

// CREATE TASK CATEGORY
exports.createTaskCategory = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const userId = req.user.User_id;

        const { name, description, icon } = req.body;

        const category = await TaskCategory.create({
            organizationId,
            createdBy: userId,
            name,
            description,
            icon
        });

        return res.status(201).json({
            success: true,
            message: "Task category created successfully.",
            category
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists."
            });
        }

        console.error("Create Task Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create task category."
        });
    }
};


// GET ALL TASK CATEGORIES
exports.getTaskCategories = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;

        const categories = await TaskCategory.find({
            organizationId
        })
            .sort({ name: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (error) {
        console.error("Get Task Categories Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch task categories."
        });
    }
};


// UPDATE TASK CATEGORY
exports.updateTaskCategory = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { id } = req.params;

        const allowedFields = [
            "name",
            "description",
            "icon",
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

        const category = await TaskCategory.findOneAndUpdate(
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

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Task category not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Task category updated successfully.",
            category
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "A category with this name already exists."
            });
        }

        console.error("Update Task Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update task category."
        });
    }
};


// DELETE TASK CATEGORY
exports.deleteTaskCategory = async (req, res) => {
    try {
        const organizationId = req.user.organizationId;
        const { id } = req.params;

        const category = await TaskCategory.findOne({
            _id: id,
            organizationId
        });

        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Task category not found."
            });
        }

        // Do not delete a category that is currently used by tasks.
        const categoryInUse = await Task.exists({
            categoryId: category._id,
            organizationId
        });

        if (categoryInUse) {
            return res.status(409).json({
                success: false,
                message: "This category is currently used by one or more tasks. Reassign those tasks before deleting it."
            });
        }

        await TaskCategory.deleteOne({
            _id: category._id,
            organizationId
        });

        return res.status(200).json({
            success: true,
            message: "Task category deleted successfully."
        });

    } catch (error) {
        console.error("Delete Task Category Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete task category."
        });
    }
};
