const User = require("../models/user");

// Session check used by the frontend on startup. The `authen` middleware has
// already verified the cookie; this returns the non-sensitive user details the
// frontend keeps in Redux.
exports.tokenHandler = async (req, res) => {
  try {
    const user = await User.findById(req.user.User_id).select("name email");

    return res.status(200).json({
      success: true,
      message: "Token is valid",
      role: req.user.role,       // <-- Return role
      User_id: req.user.User_id, // <-- Optional but useful
      organizationId: req.user.organizationId || null,
      name: user?.name || req.user.name || "",
      email: user?.email || req.user.email || ""
    });
  } catch (error) {
    console.error("Token validation handler error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error"
    });
  }
};
