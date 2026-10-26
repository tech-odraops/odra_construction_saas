const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const crypto = require("crypto");
const PasswordResetToken = require("../models/PasswordResetToken");
const { sendPasswordResetEmail } = require("../services/emailService");

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // 1. Validate request
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required."
            });
        }

        // 2. Validate new password
        const passwordRegex =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must be at least 8 characters and contain a letter and a number. Spaces are not allowed."
            });
        }

        // 3. Get authenticated user ID from the JWT
        const userId = req.user?.User_id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // 4. Find the account
        const user = await User.findById(userId);

        if (!user || user.status !== "active") {
            return res.status(401).json({
                success: false,
                message: "Active account not found."
            });
        }

        // 5. Verify current password
        const passwordMatches = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!passwordMatches) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        // 6. Prevent setting the same password again
        const samePassword = await bcrypt.compare(
            newPassword,
            user.password
        );

        if (samePassword) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must be different from your current password."
            });
        }

        // 7. Hash and save the new password
        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to change password. Please try again."
        });
    }
};


exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || typeof email !== "string") {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Return the same response regardless of whether the account exists.
        const genericResponse = {
            success: true,
            message: "If an eligible account exists, password reset instructions will be sent."
        };

        const user = await User.findOne({
            email: normalizedEmail,
            status: "active"
        });

        if (!user) {
            return res.status(200).json(genericResponse);
        }

        // Invalidate previously issued reset tokens for this user.
        await PasswordResetToken.deleteMany({ userId: user._id });

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        await PasswordResetToken.create({
            userId: user._id,
            tokenHash,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        });

        const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, "");
        if (!appBaseUrl) {
            throw new Error("APP_BASE_URL is missing from environment variables.");
        }
        const resetUrl = `${appBaseUrl}/reset-password?token=${rawToken}`;
        await sendPasswordResetEmail(user.email, resetUrl);

        return res.status(200).json(genericResponse);
    } catch (error) {
        console.error("Forgot password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to process the request. Please try again."
        });
    }
};

exports.resetPassword = async (req, res) => {
    let session;

    try {
        const { token, newPassword } = req.body;

        if (
            typeof token !== "string" ||
            !token.trim() ||
            typeof newPassword !== "string" ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message: "Reset token and new password are required."
            });
        }

        const passwordRegex =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&^()_\-+=.]{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters and contain a letter and a number. Spaces are not allowed."
            });
        }

        const tokenHash = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Claim the token inside the transaction.
            const resetRecord = await PasswordResetToken.findOneAndUpdate(
                {
                    tokenHash,
                    expiresAt: { $gt: new Date() },
                    usedAt: null
                },
                {
                    $set: { usedAt: new Date() }
                },
                {
                    new: true,
                    session
                }
            );

            if (!resetRecord) {
                const error = new Error(
                    "Reset token is invalid, expired, or already used."
                );
                error.statusCode = 400;
                throw error;
            }

            const user = await User.findOne({
                _id: resetRecord.userId,
                status: "active"
            }).session(session);

            if (!user) {
                const error = new Error(
                    "Unable to reset password for this account."
                );
                error.statusCode = 400;
                throw error;
            }

            const samePassword = await bcrypt.compare(
                newPassword,
                user.password
            );

            if (samePassword) {
                const error = new Error(
                    "New password must be different from your current password."
                );
                error.statusCode = 400;
                throw error;
            }

            user.password = await bcrypt.hash(newPassword, 12);
            await user.save({ session });

            // Invalidate any other outstanding reset tokens.
            await PasswordResetToken.deleteMany(
                {
                    userId: user._id,
                    _id: { $ne: resetRecord._id }
                },
                { session }
            );
        });

        return res.status(200).json({
            success: true,
            message: "Password reset successfully."
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Reset password error:", error.message);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password. Please try again."
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};
