const Project = require('../models/project');
const User = require('../models/user');
const Report = require('../models/report');
const Worker = require('../models/Worker');
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const express = require("express");
const env = require("dotenv").config();
const ChatMessage = require("../models/chatMessage")
const InventoryItem = require("../models/inventoryItem");
const InventoryUsage = require("../models/InventoryUsage");
const Attendance = require("../models/Attendance");
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const mongoose = require("mongoose");
const Invitation = require("../models/Invitation");


const sendEmail = async (to, subject, html, replyToEmail) => {
    try {
        const response = await resend.emails.send({
            from: "OdraOps <noreply@odraops.com>",
            to: to,
            subject: subject,
            html: html,
            reply_to: replyToEmail,
        });

        console.log("Email sent:", response);
        return true;
    } catch (error) {
        console.error("RESEND ERROR:", error);
        return false;
    }
};

exports.createProject = async (req, res) => {
    let session;

    try {
        const { title, description, startDate, endDate } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({
                success: false,
                error: "Project title and description are required."
            });
        }

        const founderId = req.user.User_id;
        const organizationId = req.user.organizationId;

        // Verify the Founder belongs to this organization.
        const founder = await User.findOne({
            _id: founderId,
            organizationId
        });

        if (!founder) {
            return res.status(404).json({
                success: false,
                error: "Founder or organization account not found."
            });
        }

        let newProject;

        // Start the MongoDB transaction.
        session = await mongoose.startSession();

        await session.withTransaction(async () => {
            // Create the project inside the transaction.
            const createdProjects = await Project.create(
                [
                    {
                        title: title.trim(),
                        description: description.trim(),
                        status: "Ongoing",
                        startDate: startDate
                            ? new Date(startDate)
                            : new Date(),
                        endDate: endDate
                            ? new Date(endDate)
                            : null,
                        siteEngineer: null,
                        contractor: founderId,
                        organizationId
                    }
                ],
                { session }
            );

            newProject = createdProjects[0];

            // Add the project ID to the Founder's createdProjects array.
            const updatedFounder = await User.findOneAndUpdate(
                {
                    _id: founderId,
                    organizationId
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

            // Throwing an error aborts the transaction.
            // The project creation will also be rolled back.
            if (!updatedFounder) {
                throw new Error(
                    "Founder could not be updated with the new project."
                );
            }
        });

        // The transaction has committed successfully.
        return res.status(201).json({
            success: true,
            newProject,
            contractorName: founder.name,
            message: "Project created successfully. You can assign site members from the project details page."
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
        const contractorId = req.user.User_id;
        const contratProjects = await Project.find({ organizationId: req.user.organizationId })
            .populate('siteEngineer', 'name email')
            .populate('siteEngineers', 'name email')
            .lean();

        if (contratProjects.length === 0) {
            return res.status(200).json({
                success: true,
                projects: [],
                message: "No projects created yet."
            });
        }

        return res.status(200).json({ success: true, projects: contratProjects });
    } catch (error) {
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
            $or: [
                { siteEngineers: siteEngineerId },
                { siteEngineer: siteEngineerId }
            ]
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

// to get project by id so that both contractor and Site Engineer see the page and no other sees the page
exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        // Ensure the requester is either contractor of project or assigned Site Engineer
        const project = await Project.findOne({ _id: id, organizationId: req.user.organizationId })
            .populate('contractor', 'name email')
            .populate('siteEngineer', 'name email')
            .populate('siteEngineers', '_id name email role')
            .populate({
                path: 'reports',
                populate: { path: 'siteEngineerId', select: 'name email' },
                options: { sort: { createdAt: -1 } }
            });
        console.log(project)

        if (!project) return res.status(404).json({ message: 'Project not found' });

        // authorization
        // WILL ADD THE authorization middleware

        res.json({ project });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.completeProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await Project.findOne({
            _id: projectId,
            organizationId: req.user.organizationId
        });
        console.log(project)
        if (!project) {
            return res.status(404).json({ success: false, error: "Project not found" });
        }

        // ensure contractor owns the project
        if (project.contractor.toString() !== req.user.User_id) {
            return res.status(403).json({ success: false, error: "You are not authorized to complete this project" });
        }

        // prevent double completion
        if (project.status === "Completed") {
            return res.status(400).json({ success: false, error: "Project already completed" });
        }

        // mark the project as completed
        project.status = "Completed";
        project.endDate = new Date();
        await project.save();

        // free all workers from the project
        await Worker.updateMany(
            { currentProjectId: projectId, organizationId: req.user.organizationId },
            { currentProjectId: null, status: "free" }
        );

        // notify the Site Engineer
        const io = req.app.get("io");
        io.to(`project-${projectId}`).emit("project:completed", {
            projectId
        });
        return res.status(200).json({ success: true, message: "Project completed successfully" });

    } catch (error) {
        console.error("Complete Project Error:", error);
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
}


exports.deleteProject = async (req, res) => {
    let session;

    try {
        const { id } = req.params;
        const organizationId = req.user.organizationId;

        session = await mongoose.startSession();

        let projectName;
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

            projectName = project.title;

            const siteEngineerIds = [
                ...(Array.isArray(project.siteEngineers)
                    ? project.siteEngineers
                    : []),
                project.siteEngineer
            ]
                .filter(Boolean)
                .map((siteEngineerId) => siteEngineerId.toString());

            uniqueSiteEngineerIds = [
                ...new Set(siteEngineerIds)
            ];

            // 2. Remove the project from the Founder's project list.
            await User.findOneAndUpdate(
                {
                    _id: project.contractor,
                    organizationId
                },
                {
                    $pull: { createdProjects: project._id }
                },
                { session }
            );

            // 3. Remove the project from assigned Site Engineers.
            for (const siteEngineerId of uniqueSiteEngineerIds) {
                await User.findOneAndUpdate(
                    {
                        _id: siteEngineerId,
                        organizationId
                    },
                    {
                        $pull: { assignedProjects: project._id }
                    },
                    { session }
                );
            }

            // 4. Free workers assigned to this project.
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

            // 5. Delete reports.
            await Report.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 6. Delete chat messages.
            await ChatMessage.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 7. Delete inventory usage logs.
            await InventoryUsage.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 8. Delete inventory items.
            await InventoryItem.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 9. Delete attendance records.
            await Attendance.deleteMany(
                {
                    projectId: project._id,
                    organizationId
                },
                { session }
            );

            // 10. Delete the project last.
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

        // The transaction has committed successfully.
        // Notify connected clients only after the commit.
        const io = req.app.get("io");

        if (io) {
            for (const siteEngineerId of uniqueSiteEngineerIds) {
                io.to(`siteEngineer-${siteEngineerId}`).emit(
                    "project:deleted",
                    {
                        project_id: id,
                        project_name: projectName
                    }
                );
            }

            io.to(`project-${id}`).emit("project:deleted", {
                project_id: id,
                project_name: projectName
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project deleted successfully"
        });

    } catch (err) {
        if (err.statusCode === 404) {
            return res.status(404).json({
                success: false,
                message: err.message
            });
        }

        console.error("Delete Project Error:", err);

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
exports.getProjectWages = async (req, res) => {
    try {

        const { projectId } = req.params;
        const organizationId = req.user.organizationId;

        // 1️⃣ Get project
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        // 2️⃣ Get workers in this project
        const workers = await Worker.find({
            currentProjectId: projectId,
            organizationId
        });

        // 3️⃣ Get attendance records
        const attendanceRecords = await Attendance.find({
            projectId,
            organizationId
        });

        // 4️⃣ Count present days per worker
        const presentCount = {};

        attendanceRecords.forEach(day => {
            day.records.forEach(rec => {
                if (rec.status === "present") {
                    const wid = rec.workerId.toString();
                    presentCount[wid] = (presentCount[wid] || 0) + 1;
                }
            });
        });

        // 5️⃣ Calculate months (for monthly workers)
        const startDate = new Date(project.startDate);
        const endDate = project.status === "Completed"
            ? new Date(project.endDate)
            : new Date();

        const months =
            (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) + 1;

        // 6️⃣ Final wage calculation
        const result = workers.map(worker => {

            let totalWage = 0;

            if (worker.payoutType === "daily") {

                const days = presentCount[worker._id] || 0;
                totalWage = days * worker.dailyWage;

            } else {

                totalWage = months * worker.dailyWage; // monthly wage

            }

            return {
                workerId: worker._id,
                name: worker.name,
                payoutType: worker.payoutType,
                totalWage
            };

        });

        const totalProjectWage = result.reduce(
            (sum, w) => sum + w.totalWage,
            0
        );

        return res.status(200).json({
            success: true,
            data: {
                workers: result,
                totalProjectWage
            }
        });

    } catch (error) {

        console.error("Wage calc error:", error);

        return res.status(500).json({
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
            .populate("siteEngineer", "_id name");

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

        io.to(`project-${projectId}`)
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
            .populate("siteEngineer", "_id name");

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

        io.to(`project-${projectId}`)
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


        if (!title || title.trim() == "") {
            return res.status(400).json({
                success: false,
                message: "Project title is required"
            });
        };

        const project = await Project.findOne({
            _id: projectId,
            organizationId: req.user.organizationId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // only contractor can edit
        if (project.contractor.toString() !== req.user.User_id) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized"
            });
        }

        project.title = title;
        await project.save();

        // socket realtime update
        const io = req.app.get("io");

        const siteEngineerIds = [
            ...(Array.isArray(project.siteEngineers) ? project.siteEngineers : []),
            project.siteEngineer
        ]
            .filter(Boolean)
            .map((siteEngineerId) => siteEngineerId.toString());
        const uniqueSiteEngineerIds = [...new Set(siteEngineerIds)];

        // broadcast to project room
        io.to(`project-${projectId}`).emit("project:titleUpdated", {
            projectId,
            title
        });

        // broadcast to each assigned site engineer
        for (const siteEngineerId of uniqueSiteEngineerIds) {
            io.to(`siteEngineer-${siteEngineerId}`).emit("project:titleUpdated", {
                projectId,
                title
            });
        }

        return res.status(200).json({
            success: true,
            message: "Project title updated",
            project
        });


    } catch (e) {
        console.log("Update project title error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
}
