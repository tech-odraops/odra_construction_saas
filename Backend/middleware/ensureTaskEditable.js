const Task = require("../models/Task");

module.exports = async function ensureTaskEditable(req, res, next) {
    try {
        const task = await Task.findOne({
            _id: req.params.id,
            organizationId: req.user?.organizationId
        }).select("status progressQuantity totalQuantity");

        if (!task) {
            return res.status(404).json({
                success: false,
                message: "Task not found."
            });
        }

        const totalQuantity = Number(task.totalQuantity) || 0;
        const progressQuantity = Number(task.progressQuantity) || 0;
        const isComplete = task.status === "Completed" ||
            (totalQuantity > 0 && progressQuantity >= totalQuantity);

        if (isComplete) {
            return res.status(400).json({
                success: false,
                message: "This task is 100% complete and can no longer be edited."
            });
        }

        return next();
    } catch (error) {
        return next(error);
    }
};
