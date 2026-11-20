
const User = require("../models/user");
const Organization = require("../models/Organization");

const {
    getImageUrl,
    uploadImageWithThumbnail,
    ensureImageThumbnail,
    deleteImage
} = require("../services/s3Service");

const getImageVariants = async (key, thumbnailKey) => {
    if (!key) {
        return { originalUrl: null, thumbnailUrl: null, thumbnailKey: null };
    }

    const resolvedThumbnailKey = thumbnailKey || await ensureImageThumbnail(key);
    const [originalUrl, thumbnailUrl] = await Promise.all([
        getImageUrl(key),
        getImageUrl(resolvedThumbnailKey)
    ]);

    return {
        originalUrl,
        thumbnailUrl,
        thumbnailKey: resolvedThumbnailKey
    };
};

const deleteImagesSafely = async (keys, errorMessage) => {
    for (const key of keys.filter(Boolean)) {
        try {
            await deleteImage(key);
        } catch (error) {
            console.error(errorMessage, error);
        }
    }
};

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
            "name email role phoneNumber profilePictureKey profilePictureThumbnailKey organizationId"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User profile not found"
            });
        }

        const image = await getImageVariants(
            user.profilePictureKey,
            user.profilePictureThumbnailKey
        );
        if (image.thumbnailKey && !user.profilePictureThumbnailKey) {
            user.profilePictureThumbnailKey = image.thumbnailKey;
            await user.save();
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
                profilePictureUrl: image.originalUrl,
                profilePictureThumbnailUrl: image.thumbnailUrl
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
    let newImageThumbnailKey = null;
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
        const oldImageThumbnailKey = user.profilePictureThumbnailKey;

        // Upload new profile picture
        if (req.file) {
            if (!validateImageContent(req.file)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid image content. Only valid JPG, PNG and WEBP images are allowed"
                });
            }

            const uploadResult = await uploadImageWithThumbnail({
                file: req.file,
                folder: `organizations/${req.user.organizationId}/users/${user._id}/profile`
            });

            newImageKey = uploadResult.key;
            newImageThumbnailKey = uploadResult.thumbnailKey;
            updates.profilePictureKey = newImageKey;
            updates.profilePictureThumbnailKey = newImageThumbnailKey;
        }

        // Save updated user profile
        Object.assign(user, updates);

        await user.save();
        databaseUpdated = true;

        // Delete previous image after successful database update
        if (newImageKey) {
            await deleteImagesSafely(
                [oldImageKey, oldImageThumbnailKey],
                "Old profile image cleanup failed:"
            );
        }

        const image = await getImageVariants(
            user.profilePictureKey,
            user.profilePictureThumbnailKey
        );
        if (image.thumbnailKey && !user.profilePictureThumbnailKey) {
            user.profilePictureThumbnailKey = image.thumbnailKey;
            await user.save();
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
                profilePictureUrl: image.originalUrl,
                profilePictureThumbnailUrl: image.thumbnailUrl
            }
        });

    } catch (error) {
        console.error("Update user profile error:", error);

        // Clean up new image only if database update failed
        if (newImageKey && !databaseUpdated) {
            await deleteImagesSafely(
                [newImageKey, newImageThumbnailKey],
                "New profile image cleanup failed:"
            );
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
        }).select("name logoKey logoThumbnailKey ownerId");

        if (!organization) {
            return res.status(404).json({
                success: false,
                message: "Organization profile not found"
            });
        }

        const image = await getImageVariants(
            organization.logoKey,
            organization.logoThumbnailKey
        );
        if (image.thumbnailKey && !organization.logoThumbnailKey) {
            organization.logoThumbnailKey = image.thumbnailKey;
            await organization.save();
        }

        return res.status(200).json({
            success: true,
            message: "Organization profile fetched successfully",
            organization: {
                organizationId: organization._id,
                name: organization.name,
                logoUrl: image.originalUrl,
                logoThumbnailUrl: image.thumbnailUrl
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
    let newLogoThumbnailKey = null;
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
        const oldLogoThumbnailKey = organization.logoThumbnailKey;

        // Upload new organization logo
        if (req.file) {
            if (!validateImageContent(req.file)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid image content. Only valid JPG, PNG and WEBP images are allowed"
                });
            }

            const uploadResult = await uploadImageWithThumbnail({
                file: req.file,
                folder: `organizations/${organization._id}/logo`
            });

            newLogoKey = uploadResult.key;
            newLogoThumbnailKey = uploadResult.thumbnailKey;
            updates.logoKey = newLogoKey;
            updates.logoThumbnailKey = newLogoThumbnailKey;
        }

        // Save organization changes
        Object.assign(organization, updates);

        await organization.save();
        databaseUpdated = true;

        // Delete previous logo after successful database update
        if (newLogoKey) {
            await deleteImagesSafely(
                [oldLogoKey, oldLogoThumbnailKey],
                "Old organization logo cleanup failed:"
            );
        }

        const image = await getImageVariants(
            organization.logoKey,
            organization.logoThumbnailKey
        );
        if (image.thumbnailKey && !organization.logoThumbnailKey) {
            organization.logoThumbnailKey = image.thumbnailKey;
            await organization.save();
        }

        return res.status(200).json({
            success: true,
            message: "Organization profile updated successfully",
            organization: {
                organizationId: organization._id,
                name: organization.name,
                logoUrl: image.originalUrl,
                logoThumbnailUrl: image.thumbnailUrl
            }
        });

    } catch (error) {
        console.error("Update organization profile error:", error);

        // Clean up new logo only if database update failed
        if (newLogoKey && !databaseUpdated) {
            await deleteImagesSafely(
                [newLogoKey, newLogoThumbnailKey],
                "New organization logo cleanup failed:"
            );
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update organization profile"
        });
    }
};
