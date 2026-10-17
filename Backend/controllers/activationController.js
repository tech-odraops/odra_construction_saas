const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const User = require("../models/user");
const Organization = require("../models/Organization");
const Invitation = require("../models/Invitation");

exports.activateAccount = async (req, res) => {
    const { token, password } = req.body;

    // 1. Validate request
    if (!token || !password) {
        return res.status(400).json({
            success: false,
            message: "Activation token and password are required."
        });
    }

    // Match the existing password policy.
    const passwordRegex =
        /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/;

    if (!passwordRegex.test(password)) {
        return res.status(400).json({
            success: false,
            message:
                "Password must be at least 8 characters and contain a letter and a number. Spaces are not allowed."
        });
    }

    // 2. Hash the supplied token before looking it up.
    const tokenHash = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    const session = await mongoose.startSession();

    try {
        let activatedUserId;

        await session.withTransaction(async () => {
            const now = new Date();

            // 3. Atomically claim a valid, unused invitation.
            const invitation = await Invitation.findOneAndUpdate(
                {
                    tokenHash,
                    status: "invited",
                    expiresAt: { $gt: now }
                },
                {
                    $set: {
                        status: "accepted",
                        acceptedAt: now
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!invitation) {
                const error = new Error(
                    "Invalid, expired, or already-used activation link."
                );
                error.statusCode = 400;
                throw error;
            }

            // 4. Find the invited account in the correct organization.
            const user = await User.findOne({
                email: invitation.email,
                organizationId: invitation.organizationId,
                role: invitation.role,
                status: "invited"
            }).session(session);

            if (!user) {
                const error = new Error(
                    "The invited account could not be found or is no longer eligible for activation."
                );
                error.statusCode = 400;
                throw error;
            }

            const organization = await Organization.findById(
                invitation.organizationId
            ).session(session);

            if (!organization || organization.status === "suspended") {
                const error = new Error(
                    "This organization cannot be activated."
                );
                error.statusCode = 400;
                throw error;
            }

            // 5. Only the actual organization owner can activate it
            // through the Founder invitation.
            if (user.role === "Founder") {
                if (
                    String(organization.ownerId) !== String(user._id)
                ) {
                    const error = new Error(
                        "Founder account does not match the organization owner."
                    );
                    error.statusCode = 400;
                    throw error;
                }

                organization.status = "active";
                await organization.save({ session });
            }

            // 6. Set the password and activate the account.
            user.password = await bcrypt.hash(password, 12);
            user.status = "active";

            await user.save({ session });

            activatedUserId = user._id;
        });

        return res.status(200).json({
            success: true,
            message: "Account activated successfully. You can now log in."
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Account activation error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to activate the account. Please try again."
        });
    } finally {
        await session.endSession();
    }
};
