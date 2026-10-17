
exports.validateRoles = (roles = []) => (req, res, next) => {
    // Authentication middleware must run before this middleware.
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required"
        });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Forbidden: insufficient permissions"
        });
    }

    return next();
};
