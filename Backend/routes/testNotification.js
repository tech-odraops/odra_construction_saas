const express = require("express");
const router = express.Router();

const User = require("../models/user");
const { sendToUser } = require("../services/notification.service");
const { authen } = require("../middleware/tokenValidatorsMiddleware");
const { validateRoles } = require("../middleware/roles");

router.get("/test", authen, validateRoles(["admin"]), async (req, res) => {

    try {

        const user = await User.findOne({
            email: req.query.email || "nitinmohapatra26@gmail.com"
        });

        if (!user || !user.fcmToken) {
            return res.status(404).json({
                message: "User or FCM Token not found"
            });
        }

        await sendToUser({

            token: user.fcmToken,

            title: "ODRAOPS",

            body: "Congratulations 🎉 Your first notification works!",

            data: {
                type: "test",
                url: "/contractor/home"
            }

        });

        res.json({
            success: true
        });

    } catch {

        console.error("Test notification failed.");

        res.status(500).json({
            success: false
        });

    }

});

module.exports = router;