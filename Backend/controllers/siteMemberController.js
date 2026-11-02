const crypto = require("crypto");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { Resend } = require("resend");

const User = require("../models/user");
const Project = require("../models/project");
const Organization = require("../models/Organization");
const Invitation = require("../models/Invitation");

const resend = new Resend(process.env.RESEND_API_KEY);

const ALLOWED_MEMBER_ROLES = ["Site Engineer", "Site Supervisor"];
const INVITATION_EXPIRY_HOURS = 72;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, (character) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };

        return entities[character];
    });

const escapeRegex = (value = "") =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// GET: Search active members belonging to the authenticated Founder's organization.
exports.searchSiteMembers = async (req, res) => {
    try {
        const requesterId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const requesterRole = req.user?.role;

        if (!requesterId || !organizationId) {
            return res.status(401).json({
                success: false,
                message: "Authentication and organization information are required."
            });
        }

        if (
            !mongoose.isValidObjectId(requesterId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(requesterRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to search organization members."
            });
        }

        const organization = await Organization.findById(organizationId)
            .select("_id ownerId status");

        if (!organization || organization.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        const requester = await User.findOne({
            _id: requesterId,
            organizationId,
            role: requesterRole,
            status: "active"
        }).select("_id");

        if (!requester) {
            return res.status(403).json({
                success: false,
                message: "Your active organization membership could not be verified."
            });
        }

        if (
            requesterRole === "Founder" &&
            requesterId.toString() !== organization.ownerId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the organization's Founder can manage its members."
            });
        }

        const search = String(req.query.search || "").trim();

        if (search.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Search text must not exceed 100 characters."
            });
        }

        const query = {
            organizationId,
            status: "active",
            role: { $in: ALLOWED_MEMBER_ROLES }
        };

        if (search) {
            const safeSearch = escapeRegex(search);

            query.$or = [
                { name: { $regex: safeSearch, $options: "i" } },
                { email: { $regex: safeSearch, $options: "i" } }
            ];
        }

        const members = await User.find(query)
            .select("_id name email role")
            .sort({ name: 1 })
            .limit(20)
            .lean();

        return res.status(200).json({
            success: true,
            members
        });

    } catch (error) {
        console.error("Search Site Members Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to search site members."
        });
    }
};

// POST: Invite a new Site Engineer or Site Supervisor.
exports.inviteSiteMember = async (req, res) => {
    let session;

    try {
        const requesterId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const requesterRole = req.user?.role;

        if (!requesterId || !organizationId) {
            return res.status(401).json({
                success: false,
                message: "Authentication and organization information are required."
            });
        }

        if (
            !mongoose.isValidObjectId(requesterId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(requesterRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to invite site members."
            });
        }

        const name =
            typeof req.body.name === "string"
                ? req.body.name.trim()
                : "";

        const email =
            typeof req.body.email === "string"
                ? req.body.email.trim().toLowerCase()
                : "";

        const role =
            typeof req.body.role === "string"
                ? req.body.role.trim()
                : "";

        if (!name || !email || !role) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and role are required."
            });
        }

        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Name must not exceed 100 characters."
            });
        }

        if (email.length > 254 || !emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address."
            });
        }

        if (!ALLOWED_MEMBER_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be Site Engineer or Site Supervisor."
            });
        }

        // Validate the activation URL configuration.
        const frontendBaseUrl = (
            process.env.FRONTEND_URL ||
            process.env.APP_BASE_URL ||
            ""
        ).replace(/\/+$/, "");

        if (!frontendBaseUrl) {
            console.error(
                "FRONTEND_URL or APP_BASE_URL is not configured."
            );

            return res.status(500).json({
                success: false,
                message: "Invitation service is not configured correctly."
            });
        }

        // Verify the organization.
        const organization = await Organization.findById(organizationId)
            .select("_id name ownerId status");

        if (!organization || organization.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Your organization is not active and cannot invite members."
            });
        }

        // Verify the actual requester.
        const requester = await User.findOne({
            _id: requesterId,
            organizationId,
            role: requesterRole,
            status: "active"
        }).select("_id name email organizationId role");

        if (!requester) {
            return res.status(403).json({
                success: false,
                message: "Your active organization membership could not be verified."
            });
        }

        // Ensure a Founder requester is the actual organization owner.
        if (
            requesterRole === "Founder" &&
            requesterId.toString() !== organization.ownerId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the organization's Founder can invite members."
            });
        }

        // Never move an existing user between organizations.
        const existingUser = await User.findOne({ email })
            .select("_id organizationId role status");

        if (existingUser) {
            if (
                String(existingUser.organizationId) !==
                String(organizationId)
            ) {
                return res.status(409).json({
                    success: false,
                    code: "EMAIL_BELONGS_TO_ANOTHER_ORGANIZATION",
                    message:
                        "This email is already registered. Members cannot be moved between organizations."
                });
            }

            if (existingUser.status === "active") {
                return res.status(409).json({
                    success: false,
                    code: "MEMBER_ALREADY_ACTIVE",
                    message:
                        "This user is already active in your organization. Select them from the member search instead."
                });
            }

            return res.status(409).json({
                success: false,
                code: "ACCOUNT_ALREADY_EXISTS",
                message:
                    "An account with this email already exists. Check its invitation status before trying again."
            });
        }

        // Avoid issuing a second unexpired invitation.
        const pendingInvitation = await Invitation.findOne({
            organizationId,
            email,
            status: "invited",
            expiresAt: { $gt: new Date() }
        }).select("_id");

        if (pendingInvitation) {
            return res.status(409).json({
                success: false,
                code: "INVITATION_ALREADY_PENDING",
                message:
                    "An unexpired invitation already exists for this email address."
            });
        }

        // Generate the activation token.
        const rawToken = crypto.randomBytes(32).toString("hex");

        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const expiresAt = new Date(
            Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000
        );

        // Generate an unusable initial password.
        const unusablePassword = crypto.randomBytes(48).toString("hex");
        const passwordHash = await bcrypt.hash(unusablePassword, 12);

        let createdUser;
        let invitation;

        // User and Invitation must succeed or fail together.
        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const userExists = await User.findOne({ email })
                .session(session)
                .select("_id");

            if (userExists) {
                const error = new Error(
                    "An account with this email already exists."
                );
                error.code = 11000;
                throw error;
            }

            const invitationExists = await Invitation.findOne({
                organizationId,
                email,
                status: "invited",
                expiresAt: { $gt: new Date() }
            })
                .session(session)
                .select("_id");

            if (invitationExists) {
                const error = new Error(
                    "An unexpired invitation already exists."
                );
                error.statusCode = 409;
                throw error;
            }

            const createdUsers = await User.create(
                [
                    {
                        name,
                        email,
                        password: passwordHash,
                        role,
                        organizationId,
                        status: "invited"
                    }
                ],
                { session }
            );

            createdUser = createdUsers[0];

            const createdInvitations = await Invitation.create(
                [
                    {
                        organizationId,
                        email,
                        role,

                        // Record whether the Founder or Site Engineer invited them.
                        invitedBy: requester._id,

                        tokenHash,
                        expiresAt,
                        status: "invited"
                    }
                ],
                { session }
            );

            invitation = createdInvitations[0];
        });

        // Send email only after the transaction commits.
        const activationUrl =
            `${frontendBaseUrl}/activate-account?token=${encodeURIComponent(rawToken)}`;

        const safeName = escapeHtml(name);
        const safeRequesterName = escapeHtml(requester.name);
        const safeOrganizationName = escapeHtml(organization.name);
        const safeRole = escapeHtml(role);
        const safeActivationUrl = escapeHtml(activationUrl);

        const emailHtml = `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#222;">
                <h2>You're invited to ODRAOPS</h2>
                <p>Hello ${safeName},</p>
                <p>
                    <strong>${safeRequesterName}</strong> has invited you to join
                    <strong>${safeOrganizationName}</strong> as a
                    <strong>${safeRole}</strong>.
                </p>
                <p>Set your password to activate your account and access the platform.</p>
                <p style="margin:28px 0;">
                    <a href="${safeActivationUrl}"
                       style="background:#176b55;color:#fff;padding:12px 20px;text-decoration:none;border-radius:5px;display:inline-block;">
                        Activate Account
                    </a>
                </p>
                <p>This invitation expires in ${INVITATION_EXPIRY_HOURS} hours and can only be used once.</p>
                <p>If you were not expecting this invitation, you can ignore this email.</p>
                <hr style="border:none;border-top:1px solid #ddd;margin-top:28px;" />
                <p style="font-size:12px;color:#777;">ODRAOPS</p>
            </div>
        `;

        let emailResponse;

        try {
            emailResponse = await resend.emails.send({
                from: "OdraOps <noreply@odraops.com>",
                to: [email],
                subject: `Invitation to join ${organization.name} on ODRAOPS`,
                html: emailHtml,
                replyTo: requester.email
            });
        } catch (emailError) {
            console.error(
                "Invitation email delivery failed after database commit:",
                emailError
            );

            return res.status(502).json({
                success: false,
                code: "INVITATION_EMAIL_DELIVERY_FAILED",
                message:
                    "The account and invitation were created, but the invitation email could not be delivered. Please retry sending the invitation instead of creating another account."
            });
        }

        if (emailResponse?.error) {
            console.error(
                "Invitation email provider error:",
                emailResponse.error
            );

            return res.status(502).json({
                success: false,
                code: "INVITATION_EMAIL_DELIVERY_FAILED",
                message:
                    "The account and invitation were created, but the invitation email could not be delivered. Please retry sending the invitation instead of creating another account."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Invitation sent successfully.",
            member: {
                _id: createdUser._id,
                name: createdUser.name,
                email: createdUser.email,
                role: createdUser.role,
                status: createdUser.status
            },
            invitation: {
                expiresAt: invitation.expiresAt,
                status: invitation.status
            }
        });

    } catch (error) {
        console.error("Invite Site Member Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message:
                    "A user or invitation with these details already exists. Refresh the member list and try again."
            });
        }

        if (error.statusCode === 409) {
            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to send the invitation. Please try again later."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// POST: Assign an active Site Engineer to a project.
exports.assignSiteMember = async (req, res) => {
    let session;

    try {
        const { projectId } = req.params;
        const { userId } = req.body;

        const requesterId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const requesterRole = req.user?.role;

        if (
            !requesterId ||
            !organizationId ||
            !mongoose.isValidObjectId(requesterId) ||
            !mongoose.isValidObjectId(organizationId) ||
            !mongoose.isValidObjectId(projectId)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid project or authentication information."
            });
        }

        if (!userId || !mongoose.isValidObjectId(userId)) {
            return res.status(400).json({
                success: false,
                message: "A valid Site Engineer is required."
            });
        }

        if (!["Founder", "Site Engineer"].includes(requesterRole)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to assign Site Engineers."
            });
        }

        // Find the organization's actual Founder.
        const organization = await Organization.findById(organizationId)
            .select("_id ownerId status");

        if (!organization || organization.status !== "active") {
            return res.status(403).json({
                success: false,
                message: "Organization not found or inactive."
            });
        }

        const founderId = organization.ownerId;

        // Verify the requester is an active user in this organization.
        const requester = await User.findOne({
            _id: requesterId,
            organizationId,
            role: requesterRole,
            status: "active"
        }).select("_id name");

        if (!requester) {
            return res.status(403).json({
                success: false,
                message: "Your active organization membership could not be verified."
            });
        }

        // Founder must be the actual organization owner.
        if (
            requesterRole === "Founder" &&
            requesterId.toString() !== founderId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "Only the organization's Founder can manage its projects."
            });
        }

        // Find the project within the organization.
        const project = await Project.findOne({
            _id: projectId,
            organizationId,
            contractor: founderId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found in your organization."
            });
        }

        // A Site Engineer can assign members only to a project
        // to which that Site Engineer is already assigned.
        if (requesterRole === "Site Engineer") {
            const isRequesterAssigned =
                Array.isArray(project.siteEngineers) &&
                project.siteEngineers.some(
                    (engineerId) =>
                        engineerId.toString() === requesterId.toString()
                );

            if (!isRequesterAssigned) {
                return res.status(403).json({
                    success: false,
                    message: "You must be assigned to this project before assigning other Site Engineers."
                });
            }
        }

        // Only active Site Engineers from the same organization can be assigned.
        const member = await User.findOne({
            _id: userId,
            organizationId,
            role: "Site Engineer",
            status: "active"
        }).select("_id name email role");

        if (!member) {
            return res.status(400).json({
                success: false,
                message: "Only active Site Engineers in your organization can be assigned."
            });
        }

        if (!Array.isArray(project.siteEngineers)) {
            project.siteEngineers = [];
        }

        const alreadyAssigned = project.siteEngineers.some(
            (engineerId) =>
                engineerId.toString() === member._id.toString()
        );

        if (alreadyAssigned) {
            return res.status(409).json({
                success: false,
                message: "This Site Engineer is already assigned to the project."
            });
        }

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Update the project's Site Engineer list.
            project.siteEngineers.push(member._id);

            await project.save({ session });

            // Keep the Site Engineer's assignedProjects array in sync.
            const updatedMember = await User.findOneAndUpdate(
                {
                    _id: member._id,
                    organizationId,
                    role: "Site Engineer",
                    status: "active"
                },
                {
                    $addToSet: {
                        assignedProjects: project._id
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedMember) {
                throw new Error(
                    "Site Engineer could not be updated with the project assignment."
                );
            }
        });

        // Notify the assigned Site Engineer after the transaction commits.
        const io = req.app.get("io");

        if (io) {
            io.to(`siteEngineer-${member._id}`).emit(
                "project:assigned",
                {
                    newProject: project.toObject(),
                    contractorName: requester.name || "Founder"
                }
            );
        }

        return res.status(200).json({
            success: true,
            message: "Site Engineer assigned successfully.",
            projectId: project._id,
            member: {
                _id: member._id,
                name: member.name,
                email: member.email,
                role: member.role
            }
        });

    } catch (error) {
        console.error("Assign Site Member Error:", error);

        return res.status(500).json({
            success: false,
            message: "Could not assign Site Engineer."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};