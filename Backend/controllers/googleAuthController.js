require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Organization = require('../models/Organization');

// creating instance of google auth
const client = new OAuth2Client({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: "https://odraops.com"
})


// google auth handler
const googleAuthHandler = async (req, res) => {
    try {
        const { code, origin } = req.body;
        if (!code) { return res.status(400).json({ success: false, error: "Authorization code is required" }) };

        // get the tokens from the google auth by exchanging the code for tokens
        const { tokens } = await client.getToken({ code, redirect_uri: origin || "https://odraops.com" });

        // verify the tokens 
        const { id_token } = tokens;
        const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID,   // our client id
        });

        if (!ticket) { return res.status(400).json({ success: false, error: "Invalid token" }) };

        // extract the user's email and name from the ticket
        const payload = ticket.getPayload();
        const { email, name, picture } = payload;

        // check if the user already exists
        const existingUser = await User.findOne({ email });

        const allowedRoles = [
            "Founder",
            "Site Supervisor",
            "Site Engineer"
        ];

        if (!allowedRoles.includes(existingUser.role)) {
            return res.status(403).json({
                success: false,
                error: "This account role is not permitted to sign in."
            });
        }

        if (existingUser.status !== "active") {
            return res.status(403).json({
                success: false,
                error: "Your account is not active."
            });
        }

        if (!existingUser.organizationId) {
            return res.status(403).json({
                success: false,
                error: "This account is not associated with an organization."
            });
        }

        const organization = await Organization.findOne({
            _id: existingUser.organizationId,
            status: "active"
        });

        if (!organization) {
            return res.status(403).json({
                success: false,
                error: "This organization is not active."
            });
        }

        // if the user doesnot exist then send a success false msg to frontend and frontend will redirect to singup page
        if (!existingUser) { return res.status(200).json({ success: false, error: "User not found", redirect: "/Signup" }); };

        // if the user exists then send a success true msg to frontend and create a new token for the user
        const token = jwt.sign({
            User_id: existingUser._id,
            isLoggedIn: true,
            role: existingUser.role,
            organizationId: existingUser.organizationId
        }, process.env.secret_key, { expiresIn: '1h' });

        if (existingUser.role === "Founder") {
            return res.status(200).json({
                success: true,
                token,
                User_id: existingUser._id,
                role: existingUser.role,
                organizationId: existingUser.organizationId,
                redirect: "/contractor/home",
                name
            });
        } else if (existingUser.role === "Site Engineer") {
            return res.status(200).json({
                success: true,
                token,
                User_id: existingUser._id,
                role: existingUser.role,
                organizationId: existingUser.organizationId,
                redirect: "/engineer/home",
                name
            });
        } else {
            return res.status(200).json({
                success: true,
                token,
                User_id: existingUser._id,
                role: existingUser.role,
                organizationId: existingUser.organizationId,
                redirect: "/",
                name
            });
        }
    } catch (e) {
        console.error("GOOGLE ERROR:", e.response?.data || e.message);
        return res.status(500).json({ success: false, error: "Internal server error", errorObject: e });
    }
}

// export the googleAuthHandler
module.exports = { googleAuthHandler };