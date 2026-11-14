const Project = require('../models/project');
const User = require('../models/user');
const Report = require('../models/report');
const Worker = require('../models/Worker');
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const express = require("express");
const env = require("dotenv").config();
const ChatMessage = require("../models/chatMessage")
const {
    emitToRooms,
    projectRoom,
    clearRoom
} = require("../utils/socketRooms");
const InventoryItem = require("../models/inventoryItem");
const InventoryUsage = require("../models/InventoryUsage");
const Attendance = require("../models/Attendance");
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const mongoose = require("mongoose");
const Invitation = require("../models/Invitation");
const Organization = require("../models/Organization");

const canManageProject = (project, user) => {
    const userId = user?.User_id?.toString();
    const role = user?.role;

    if (!userId || !role) return false;

    // Founder can manage projects they own.
    if (role === "Founder") {
        return project.contractor?.toString() === userId;
    }

    // Site Engineer can manage only projects assigned to them.
    if (role === "Site Engineer") {
        return Array.isArray(project.siteEngineers) &&
            project.siteEngineers.some(
                (engineerId) => engineerId.toString() === userId
            );
    }

    return false;
};


// create Project
exports.createProject = async (req, res) => {
    let session;

    try {
        const { title, description, startDate, endDate } = req.body;

        const creatorId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const creatorRole = req.user?.role;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({
                success: false,
                error: "Project title and description are required."
            });
        }

        if (
            !creatorId ||
            !organizationId ||
            !mongoose.isValidObjectId(creatorId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                error: "Invalid authentication context."
            });
        }

        if (!["Founder", "Site Engineer"].includes(creatorRole)) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to create projects."
            });
        }

        // Find the organization and its actual Founder.
        const organization = await Organization.findById(organizationId)
            .select("_id ownerId status");

        if (!organization || organization.status !== "active") {
            return res.status(403).json({
                success: false,
                error: "Organization not found or inactive."
            });
        }

        const founderId = organization.ownerId;

        const founder = await User.findOne({
            _id: founderId,
            organizationId,
            role: "Founder",
            status: "active"
        }).select("_id name");

        if (!founder) {
            return res.status(404).json({
                success: false,
                error: "Active Founder not found for this organization."
            });
        }

        // Verify the creator's role and organization membership.
        const creator = await User.findOne({
            _id: creatorId,
            organizationId,
            role: creatorRole,
            status: "active"
        }).select("_id role");

        if (!creator) {
            return res.status(403).json({
                success: false,
                error: "Your active organization membership could not be verified."
            });
        }

        // A Founder can create projects only for their own organization.
        if (
            creatorRole === "Founder" &&
            creator._id.toString() !== founderId.toString()
        ) {
            return res.status(403).json({
                success: false,
                error: "Only the organization's Founder can create projects as Founder."
            });
        }

        let newProject;

        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            const createdProjects = await Project.create(
                [
                    {
                        title: title.trim(),
                        description: description.trim(),
                        status: "Ongoing",
                        startDate: startDate ? new Date(startDate) : new Date(),
                        endDate: endDate ? new Date(endDate) : null,

                        // The Founder remains the project owner.
                        contractor: founderId,

                        // Automatically assign the creating Site Engineer.
                        siteEngineers:
                            creatorRole === "Site Engineer"
                                ? [creatorId]
                                : [],

                        organizationId
                    }
                ],
                { session }
            );

            newProject = createdProjects[0];

            // Every project is recorded under the organization's Founder.
            const updatedFounder = await User.findOneAndUpdate(
                {
                    _id: founderId,
                    organizationId,
                    role: "Founder"
                },
                {
                    $addToSet: {
                        createdProjects: newProject._id
                    }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedFounder) {
                throw new Error(
                    "Founder could not be updated with the new project."
                );
            }

            // If a Site Engineer created the project, record it
            // in their assignedProjects array as well.
            if (creatorRole === "Site Engineer") {
                const updatedEngineer = await User.findOneAndUpdate(
                    {
                        _id: creatorId,
                        organizationId,
                        role: "Site Engineer",
                        status: "active"
                    },
                    {
                        $addToSet: {
                            assignedProjects: newProject._id
                        }
                    },
                    {
                        new: true,
                        session
                    }
                );

                if (!updatedEngineer) {
                    throw new Error(
                        "Site Engineer could not be updated with the new project."
                    );
                }
            }
        });

        return res.status(201).json({
            success: true,
            newProject,
            contractorName: founder.name,
            message: "Project created successfully."
        });

    } catch (error) {
        console.error("Create Project Error:", error);

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "A conflicting record already exists."
            });
        }

        return res.status(500).json({
            success: false,
            error: "Could not create project."
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// get all projects for contractor
exports.getProject = async (req, res) => {

    try {
        
        const search = String(req.query.search || "").trim();
        const status = String(req.query.status || "all").trim();
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));

        const filter = {
            organizationId: req.user.organizationId
        };

        if (search) {
            filter.$or = [
                { title: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } }
            ];
        }

        if (status && status !== "all") {
            filter.status = status;
        }

        const skip = (page - 1) * limit;

        const [projects, total] = await Promise.all([
            Project.find(filter)
                .populate('siteEngineers', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Project.countDocuments(filter)
        ]);

        if (projects.length === 0) {
            return res.status(200).json({
                success: true,
                projects: [],
                total: 0,
                page,
                limit,
                message: "No projects created yet."
            });
        }

        return res.status(200).json({
            success: true,
            projects,
            total,
            page,
            limit
        });
    } catch (error) {
        console.error("Get project error:", error);
        return res.status(500).json({ success: false, error });
    }
};

// get all projects for site Eng
exports.getProjectSE = async (req, res) => {
    try {
        const siteEngineerId = req.user.User_id;

        // The .lean() method in Mongoose tells the query to return plain JavaScript objects instead of full Mongoose documents.
        // This makes queries faster and uses less memory when you only need to read data (not use Mongoose document methods).
        const allProject = await Project.find({
            organizationId: req.user.organizationId,
            siteEngineers: siteEngineerId
        })
            .select("title status contractor")
            .populate('contractor', 'name')
            .lean();

        if (allProject.length === 0) {
            return res.status(200).json({
                success: true,
                projects: [],
                message: "No Project Created Yet"
            })
        }

        return res.status(200).json({
            success: true,
            projects: allProject
        })
    } catch (error) {
        return res.status(500).json({ success: false, error });
    }
}

// Get project by ID — only the project Founder or assigned Site Engineer can access the project details and reports.
exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;

        const userId = req.user?.User_id;
        console.log(userId);
        const organizationId = req.user?.organizationId;
        const role = req.user?.role;

        // 1. Validate authenticated user context
        if (!userId || !organizationId || !role) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // 2. Find the project within the authenticated organization
        const project = await Project.findOne({
            _id: id,
            organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // 3. Founder can access projects belonging to their organization
        const isFounder = role === "Founder";

        // 4. Site Engineer must be assigned to this project
        const isAssignedSiteEngineer =
            role === "Site Engineer" &&
            Array.isArray(project.siteEngineers) &&
            project.siteEngineers.some(
                (engineerId) =>
                    engineerId.toString() === userId.toString()
            );

        // 5. Deny unauthorized access
        if (!isFounder && !isAssignedSiteEngineer) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to access this project"
            });
        }

        // 6. Populate related data only after authorization
        await project.populate([
            { path: "contractor", select: "name email" },
            { path: "siteEngineers", select: "_id name email role" },
            {
                path: "reports",
                populate: {
                    path: "siteEngineerId",
                    select: "name email"
                },
                options: {
                    sort: { createdAt: -1 }
                }
            }
        ]);

        // 7. Preserve the existing response structure
        return res.status(200).json({
            project
        });

    } catch (error) {
        if (
            error.name === "CastError" ||
            error.name === "BSONError"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        console.error("Get Project By ID Error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// mark project as complete
exports.completeProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { User_id, organizationId } = req.user;

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                error: "Invalid project ID"
            });
        }

        const project = await Project.findOne({
            _id: projectId,
            organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: "Project not found"
            });
        }

        // Founder must own the project.
        // Site Engineer must be assigned to the project.
        if (!canManageProject(project, req.user)) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to complete this project"
            });
        }

        if (project.status === "Completed") {
            return res.status(400).json({
                success: false,
                error: "Project already completed"
            });
        }

        project.status = "Completed";
        project.endDate = new Date();

        await project.save();

        // Free all workers currently assigned to this project.
        await Worker.updateMany(
            {
                currentProjectId: projectId,
                organizationId
            },
            {
                currentProjectId: null,
                status: "free"
            }
        );

        // Notify connected clients.
        const io = req.app.get("io");

        if (io) {
            emitToRooms(io, "project:completed", { projectId }, {
                userIds: [project.contractor, ...(project.siteEngineers || [])],
                projectId
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project completed successfully"
        });

    } catch (error) {
        console.error("Complete Project Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
};

// delete project
exports.deleteProject = async (req, res) => {
    let session;

    try {
        const { id } = req.params;
        const { organizationId } = req.user;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        session = await mongoose.startSession();

        let projectName;
        let projectOwnerId;
        let uniqueSiteEngineerIds = [];

        await session.withTransaction(async () => {

            // 1. Find the project within the authenticated organization.
            const project = await Project.findOne({
                _id: id,
                organizationId
            }).session(session);

            if (!project) {
                const error = new Error("Project not found");
                error.statusCode = 404;
                throw error;
            }

            // 2. Verify Founder ownership or Site Engineer assignment.
            if (!canManageProject(project, req.user)) {
                const error = new Error(
                    "You are not authorized to delete this project"
                );
                error.statusCode = 403;
                throw error;
            }

            projectName = project.title;
            projectOwnerId = project.contractor;

            uniqueSiteEngineerIds = [
                ...new Set(
                    (project.siteEngineers || [])
                        .filter(Boolean)
                        .map((engineerId) => engineerId.toString())
                )
            ];

            // 3. Remove project from the Founder's project list.
            await User.findOneAndUpdate(
                {
                    _id: project.contractor,
                    organizationId
                },
                {
                    $pull: {
                        createdProjects: project._id
                    }
                },
                { session }
            );

            // 4. Remove project from all assigned Site Engineers.
            for (const siteEngineerId of uniqueSiteEngineerIds) {
                await User.findOneAndUpdate(
                    {
                        _id: siteEngineerId,
                        organizationId
                    },
                    {
                        $pull: {
                            assignedProjects: project._id
                        }
                    },
                    { session }
                );
            }

            // 5. Free workers assigned to this project.
            await Worker.updateMany(
                {
                    currentProjectId: project._id,
                    organizationId
                },
                {
                    $set: {
                        currentProjectId: null,
                        status: "free"
                    }
                },
                { session }
            );

            // 6. Delete reports.
            await Report.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 7. Delete chat messages.
            await ChatMessage.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 8. Delete inventory usage logs.
            await InventoryUsage.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 9. Delete inventory items.
            await InventoryItem.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 10. Delete attendance records.
            await Attendance.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 11. Delete the project last.
            const deletedProject = await Project.findOneAndDelete(
                {
                    _id: project._id,
                    organizationId
                },
                { session }
            );

            if (!deletedProject) {
                throw new Error(
                    "Project could not be deleted. Transaction aborted."
                );
            }
        });

        // Transaction committed successfully.
        // Notify connected clients after the commit.
        const io = req.app.get("io");

        if (io) {
            emitToRooms(io, "project:deleted", {
                project_id: id,
                project_name: projectName
            }, {
                userIds: [projectOwnerId, ...uniqueSiteEngineerIds],
                projectId: id
            });
            await clearRoom(io, projectRoom(id));
        }

        return res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });

    } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 403) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        console.error("Delete Project Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal server error"
        });

    } finally {
        if (session) {
            await session.endSession();
        }
    }
};

// wage calculation
// Calculate project worker wages
// Founder: must own the project.
// Site Engineer: must be assigned to the project.
exports.getProjectWages = async (req, res) => {
    try {
        const { projectId } = req.params;

        const userId = req.user?.User_id;
        const organizationId = req.user?.organizationId;
        const role = req.user?.role;

        // 1. Validate authenticated user
        if (!userId || !organizationId) {
            return res.status(401).json({
                success: false,
                error: "Authentication required"
            });
        }

        // 2. Find the project within the user's organization
        const project = await Project.findOne({
            _id: projectId,
            organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                error: "Project not found"
            });
        }

        // 3. Check whether the Founder owns the project
        const isFounder =
            role === "Founder" &&
            project.contractor?.toString() === userId.toString();

        // 4. Check whether the Site Engineer is assigned to the project
        const isAssignedSiteEngineer =
            role === "Site Engineer" &&
            Array.isArray(project.siteEngineers) &&
            project.siteEngineers.some(
                (engineerId) =>
                    engineerId.toString() === userId.toString()
            );

        // 5. Deny access if the user has no authorized relationship
        if (!isFounder && !isAssignedSiteEngineer) {
            return res.status(403).json({
                success: false,
                error: "You are not authorized to view wages for this project"
            });
        }

        // 6. Get workers assigned to this project and organization
        const workers = await Worker.find({
            currentProjectId: projectId,
            organizationId
        });

        // 7. Get attendance records for this project and organization
        const attendanceRecords = await Attendance.find({
            projectId,
            organizationId
        });

        // 8. Count present days per worker
        const presentCount = {};

        attendanceRecords.forEach((day) => {
            day.records.forEach((record) => {
                if (record.status === "present") {
                    const workerId = record.workerId.toString();

                    presentCount[workerId] =
                        (presentCount[workerId] || 0) + 1;
                }
            });
        });

        // 9. Calculate project duration in months
        const startDate = new Date(project.startDate);

        const endDate =
            project.status === "Completed" && project.endDate
                ? new Date(project.endDate)
                : new Date();

        const months =
            (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) +
            1;

        // 10. Calculate wages
        const result = workers.map((worker) => {
            let totalWage = 0;

            if (worker.payoutType === "daily") {
                const days = presentCount[worker._id.toString()] || 0;

                totalWage = days * worker.dailyWage;
            } else {
                // Preserve the existing monthly wage calculation.
                totalWage = months * worker.dailyWage;
            }

            return {
                workerId: worker._id,
                name: worker.name,
                payoutType: worker.payoutType,
                totalWage
            };
        });

        // 11. Calculate total project wages
        const totalProjectWage = result.reduce(
            (sum, worker) => sum + worker.totalWage,
            0
        );

        // 12. Return the existing response structure
        return res.status(200).json({
            success: true,
            data: {
                workers: result,
                totalProjectWage
            }
        });

    } catch (error) {
        if (
            error.name === "CastError" ||
            error.name === "BSONError"
        ) {
            return res.status(400).json({
                success: false,
                error: "Invalid project ID"
            });
        }

        console.error("Wage Calculation Error:", error);

        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
};

// contractor dashboard api
exports.getContractorDashboard = async (req, res) => {
    try {
        const organizationId = new mongoose.Types.ObjectId(req.user.organizationId);

        const result = await Project.aggregate([
            {
                $match: { organizationId }
            },
            {
                $facet: {
                    stats: [
                        {
                            $group: {
                                _id: null,
                                totalProjects: { $sum: 1 },
                                ongoingProjects: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "Ongoing"] }, 1, 0]
                                    }
                                },
                                completedProjects: {
                                    $sum: {
                                        $cond: [{ $eq: ["$status", "Completed"] }, 1, 0]
                                    }
                                }
                            }
                        }
                    ],
                    recentProjects: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            }
        ]);

        const stats = result[0].stats[0] || {
            totalProjects: 0,
            ongoingProjects: 0,
            completedProjects: 0
        };

        const recentProjects = result[0].recentProjects;

        console.log("Stats = ", stats, "Recent Project = ", recentProjects);

        return res.status(200).json({
            success: true,
            ...stats,
            recentProjects
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        return res.status(500).json({ success: false });
    }
};

// add mislaneous items
exports.addMiscellaneousItem = async (req, res) => {

    try {

        const { projectId } = req.params;

        const {
            itemName,
            purchaseDate,
            unit,
            quantity,
            pricePerUnit
        } = req.body;

        const project = await Project.findById(projectId)
            .populate("contractor", "_id name")
            .populate("siteEngineers", "_id name");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const totalCost = Number(quantity) * Number(pricePerUnit);

        const newItem = {
            itemName,
            purchaseDate,
            unit,
            quantity,
            pricePerUnit,
            totalCost,
            status: "Pending",
            createdBy: req.user.id
        };

        project.miscellaneousItems.push(newItem);

        await project.save();

        // SOCKET NOTIFICATION PLACE
        const io = req.app.get("io");

        io.to(projectRoom(projectId))
            .emit("misc:new", {
                projectId,
                itemName,
                totalCost,
                projectTitle: project.title
            });

        return res.status(201).json({
            success: true,
            message: "Miscellaneous item added successfully",
            data: project.miscellaneousItems
        });

    } catch (error) {

        console.log("Add miscellaneous item error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// Approve/Reject Misc item
exports.updateMiscellaneousStatus = async (req, res) => {

    try {

        const { projectId, itemId } = req.params;

        const { status, rejectionReason } = req.body;

        const project = await Project.findById(projectId)
            .populate("contractor", "_id name")
            .populate("siteEngineers", "_id name");

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        const item = project.miscellaneousItems.id(itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Item not found"
            });
        }

        item.status = status;

        if (status === "Rejected") {
            item.rejectionReason = rejectionReason || "";
        }

        await project.save();

        // SOCKET NOTIFICATION PLACE
        const io = req.app.get("io");

        io.to(projectRoom(projectId))
            .emit("misc:updated", {
                projectId,
                itemName: item.itemName,
                status,
                rejectionReason
            });

        return res.status(200).json({
            success: true,
            message: `Item ${status.toLowerCase()} successfully`,
            data: item
        });

    } catch (error) {

        console.log("Update miscellaneous status error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

// edit title
exports.updateProjectTitle = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title } = req.body;
        const { organizationId } = req.user;

        if (!mongoose.isValidObjectId(projectId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID"
            });
        }

        if (typeof title !== "string" || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: "Project title is required"
            });
        }

        const project = await Project.findOne({
            _id: projectId,
            organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Founder must own the project.
        // Site Engineer must be assigned to the project.
        if (!canManageProject(project, req.user)) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this project"
            });
        }

        project.title = title.trim();

        await project.save();

        // Notify connected clients.
        const io = req.app.get("io");

        if (io) {
            emitToRooms(io, "project:titleUpdated", {
                projectId,
                title: project.title
            }, {
                userIds: [project.contractor, ...(project.siteEngineers || [])],
                projectId
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project title updated",
            project
        });

    } catch (error) {
        console.error("Update project title error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// Site Engineer dashboard API
exports.getSiteEngineerDashboard = async (req, res) => {
    try {
        const siteEngineerId = req.user?.User_id;
        const organizationId = req.user?.organizationId;

        if (
            !siteEngineerId ||
            !organizationId ||
            !mongoose.isValidObjectId(siteEngineerId) ||
            !mongoose.isValidObjectId(organizationId)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication context."
            });
        }

        const engineerObjectId = new mongoose.Types.ObjectId(siteEngineerId);
        const organizationObjectId = new mongoose.Types.ObjectId(organizationId);

        const result = await Project.aggregate([
            {
                $match: {
                    organizationId: organizationObjectId,
                    siteEngineers: engineerObjectId
                }
            },
            {
                $facet: {
                    stats: [
                        {
                            $group: {
                                _id: null,

                                totalProjects: {
                                    $sum: 1
                                },

                                ongoingProjects: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$status", "Ongoing"] },
                                            1,
                                            0
                                        ]
                                    }
                                },

                                completedProjects: {
                                    $sum: {
                                        $cond: [
                                            { $eq: ["$status", "Completed"] },
                                            1,
                                            0
                                        ]
                                    }
                                }
                            }
                        }
                    ],

                    recentProjects: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $project: {
                                title: 1,
                                status: 1,
                                createdAt: 1
                            }
                        }
                    ]
                }
            }
        ]);

        const stats = result[0].stats[0] || {
            totalProjects: 0,
            ongoingProjects: 0,
            completedProjects: 0
        };

        const recentProjects = result[0].recentProjects;

        return res.status(200).json({
            success: true,
            ...stats,
            recentProjects
        });

    } catch (error) {
        console.error("Site Engineer Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to fetch Site Engineer dashboard."
        });
    }
};
