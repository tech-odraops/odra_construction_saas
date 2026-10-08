const User = require("../models/user");
const Organization = require("../models/Organization");

exports.getAdminDashboard = async (req, res) => {
    try {
        const [totalUsers, totalOrganizations] = await Promise.all([
            User.countDocuments({ role: { $ne: "admin" } }),
            Organization.countDocuments()
        ]);

        return res.status(200).json({ success: true, totalUsers, totalOrganizations });
    } catch (error) {
        console.error("Admin dashboard error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

exports.getUserGrowth = async (req, res) => {
    try {
        const growth = await User.aggregate([
            { $group: { _id: { $month: "$createdAt" }, users: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const usersByMonth = Object.fromEntries(growth.map(item => [item._id, item.users]));
        const data = monthNames.map((month, index) => ({ month, users: usersByMonth[index + 1] || 0 }));
        return res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("User growth error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};
