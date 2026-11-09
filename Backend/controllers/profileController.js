
const User = require("../models/user");
const Organization = require("../models/Organization");

const {
    getImageUrl,
    uploadImage,
    deleteImage
} = require("../services/s3Service");


// Validate actual image file signature
const validateImageContent = (file) => {
    const buffer = file.buffer;

    if (!Buffer.isBuffer(buffer)) return false;

    const isJPEG =
        buffer.length >= 3 &&
        buffer[0] === 0xFF &&
        buffer[1] === 0xD8 &&
        buffer[2] === 0xFF;

    const isPNG =
        buffer.length >= 8 &&
        buffer.subarray(0, 8).equals(
            Buffer.from([
                0x89, 0x50, 0x4E, 0x47,
                0x0D, 0x0A, 0x1A, 0x0A
            ])
        );

    const isWEBP =
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP";

    return (
        (file.mimetype === "image/jpeg" && isJPEG) ||
        (file.mimetype === "image/png" && isPNG) ||
        (file.mimetype === "image/webp" && isWEBP)
    );
};


// GET: Fetch logged-in Site Engineer's profile

exports.getMyProfile = async (req, res) => {
    try {

        const user = await User.findOne({
            _id: req.user.User_id,
            organizationId: req.user.organizationId,
            role: "Site Engineer",
            status: "active"
        }).select(
            "name email role phoneNumber profilePictureKey organizationId"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        let profilePictureUrl = null;

        if (user.profilePictureKey) {
            profilePictureUrl = await getImageUrl(
                user.profilePictureKey
            );
        }

        return res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            profile: {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                profilePictureUrl
            }
        });

    } catch (error) {
        console.error("Get user profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch user profile"
        });
    }
};

// PATCH: Update logged-in Site Engineer's profile
exports.updateMyProfile = async (req, res) => {
    let newImageKey = null;
    let databaseUpdated = false;

    try {
        const user = await User.findOne({
            _id: req.user.User_id,
            organizationId: req.user.organizationId,
            role: "Site Engineer",
            status: "active"
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const { name, email, phoneNumber } = req.body || {};

        const updates = {};

        // Apply validated name
        if (name !== undefined) {
            updates.name = name;
        }

        // Check email uniqueness in MongoDB
        if (email !== undefined) {
            const existingUser = await User.findOne({
                email,
                _id: { $ne: user._id }
            }).select("_id");

            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "This email address is already registered"
                });
            }

            updates.email = email;
        }

        // Apply validated phone number
        if (phoneNumber !== undefined) {
            updates.phoneNumber = phoneNumber
                ? phoneNumber.trim()
                : null;
        }

        // Check whether anything was submitted
        if (
            Object.keys(updates).length === 0 &&
            !req.file
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field or profile picture to update"
            });
        }

        const oldImageKey = user.profilePictureKey;

        // Upload new profile picture
        if (req.file) {
            if (!validateImageContent(req.file)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid image content. Only valid JPG, PNG and WEBP images are allowed"
                });
            }

            const uploadResult = await uploadImage({
                file: req.file,
                folder: `organizations/${req.user.organizationId}/users/${user._id}/profile`
            });

            newImageKey = uploadResult.key;
            updates.profilePictureKey = newImageKey;
        }

        // Save updated user profile
        Object.assign(user, updates);

        await user.save();
        databaseUpdated = true;

        // Delete previous image after successful database update
        if (newImageKey && oldImageKey) {
            try {
                await deleteImage(oldImageKey);
            } catch (deleteError) {
                console.error(
                    "Old profile image cleanup failed:",
                    deleteError
                );
            }
        }

        // Generate fresh signed URL
        let profilePictureUrl = null;

        if (user.profilePictureKey) {
            profilePictureUrl = await getImageUrl(
                user.profilePictureKey
            );
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            profile: {
                userId: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phoneNumber: user.phoneNumber,
                profilePictureUrl
            }
        });

    } catch (error) {
        console.error("Update user profile error:", error);

        // Clean up new image only if database update failed
        if (newImageKey && !databaseUpdated) {
            try {
                await deleteImage(newImageKey);
            } catch (cleanupError) {
                console.error(
                    "New profile image cleanup failed:",
                    cleanupError
                );
            }
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "This email address is already registered"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update user profile"
        });
    }
};

// GET: Fetch organization profile (Founder only)
exports.getOrganizationProfile = async (req, res) => {
    try {
        const organization = await Organization.findOne({
            _id: req.user.organizationId,
            ownerId: req.user.User_id,
            status: "active"
        }).select("name logoKey ownerId");

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization profile not found"
            });
        }

        let logoUrl = null;

        if (organization.logoKey) {
            logoUrl = await getImageUrl(organization.logoKey);
        }

        return res.status(200).json({
            success: true,
            message: "Organization profile fetched successfully",
            organization: {
                organizationId: organization._id,
                name: organization.name,
                logoUrl
            }
        });

    } catch (error) {
        console.error("Get organization profile error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch organization profile"
        });
    }
};

// PATCH: Update Founder organization profile
exports.updateOrganizationProfile = async (req, res) => {
    let newLogoKey = null;
    let databaseUpdated = false;

    try {
        const organization = await Organization.findOne({
            _id: req.user.organizationId,
            ownerId: req.user.User_id,
            status: "active"
        });

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization profile not found"
            });
        }

        const { name } = req.body || {};

        const updates = {};

        // Apply validated organization name
        if (name !== undefined) {
            updates.name = name;
        }

        // Check whether anything was submitted
        if (
            Object.keys(updates).length === 0 &&
            !req.file
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide an organization name or logo to update"
            });
        }

        const oldLogoKey = organization.logoKey;

        // Upload new organization logo
        if (req.file) {
            if (!validateImageContent(req.file)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid image content. Only valid JPG, PNG and WEBP images are allowed"
                });
            }

            const uploadResult = await uploadImage({
                file: req.file,
                folder: `organizations/${organization._id}/logo`
            });

            newLogoKey = uploadResult.key;
            updates.logoKey = newLogoKey;
        }

        // Save organization changes
        Object.assign(organization, updates);

        await organization.save();
        databaseUpdated = true;

        // Delete previous logo after successful database update
        if (newLogoKey && oldLogoKey) {
            try {
                await deleteImage(oldLogoKey);
            } catch (deleteError) {
                console.error(
                    "Old organization logo cleanup failed:",
                    deleteError
                );
            }
        }

        // Generate fresh signed URL
        let logoUrl = null;

        if (organization.logoKey) {
            logoUrl = await getImageUrl(organization.logoKey);
        }

        return res.status(200).json({
            success: true,
            message: "Organization profile updated successfully",
            organization: {
                organizationId: organization._id,
                name: organization.name,
                logoUrl
            }
        });

    } catch (error) {
        console.error("Update organization profile error:", error);

        // Clean up new logo only if database update failed
        if (newLogoKey && !databaseUpdated) {
            try {
                await deleteImage(newLogoKey);
            } catch (cleanupError) {
                console.error(
                    "New organization logo cleanup failed:",
                    cleanupError
                );
            }
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update organization profile"
        });
    }
};
