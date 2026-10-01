const Project = require('../models/project');
const User = require('../models/user');
const Report = require('../models/report');
const Worker = require('../models/Worker');
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const express = require("express");
const env = require("dotenv").config();
const Subscription = require("../models/Subscription");
const ChatMessage = require("../models/chatMessage")
const InventoryItem = require("../models/inventoryItem");
const InventoryUsage = require("../models/InventoryUsage");
const Attendance = require("../models/Attendance");
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const mongoose = require("mongoose");


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
    try {
        const { title, description, startDate, endDate, siteEngineerEmail, siteEngineerName } = req.body;
        if (!title || !description || !siteEngineerEmail) {
            return res.status(404).json({ success: false, error: "Fields can not be empty." });
        }

        const contractorId = req.user.User_id;
        const organizationId = req.user.organizationId;

        // Ensure contractor exists
        const contractor = await User.findOne({ _id: contractorId, organizationId: req.user.organizationId });
        if (!contractor) {
            return res.status(404).json({ success: false, error: "Contractor not found" });
        }

        // check for suscription plan
        const subscription = await Subscription.findOne({ organizationId });
        if (!subscription) {
            return res.status(403).json({
                success: false,
                error: "Subscription not found for organization"
            });
        }
        // if it is a free plan
        if (subscription.plan === "free") {
            const existingProjectCount = contractor.totalProjects;

            if (existingProjectCount >= 1) {
                return res.status(402).json({
                    success: false,
                    error: "Free plan allows only 1 project. Please upgrade to Business plan."
                });
            }
        }
        // if business plan but expired
        if (subscription.plan === "business" && subscription.status != "active") {
            return res.status(402).json({
                success: false,
                error: "Subscription expired. Please renew your Business plan."
            });
        }


        // 🔎 Find site engineer by email
        let stEng = await User.findOne({
            email: siteEngineerEmail,
            role: "site engineer"
        });

        // 🚫 If engineer exists but belongs to another organization → BLOCK
        if (stEng && stEng.organizationId?.toString() !== organizationId) {
            return res.status(403).json({
                success: false,
                error: "Site engineer belongs to another organization"
            });
        }

        // 🆕 If engineer does not exist → create inside same organization
        let tempPassword = null;
        if (!stEng) {
            console.log("Creating SE")
            tempPassword = crypto.randomBytes(4).toString("hex"); // random 8 chars
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            stEng = await User.create({
                name: siteEngineerName,
                email: siteEngineerEmail,
                password: hashedPassword,
                role: "site engineer",
                organizationId
            });

        }
        // send email to site engineer 
        if (tempPassword) {
            const htmlContent = `
    <div style="font-family: Arial, sans-serif; background:#f4f6f9; padding:20px;">
        <div style="max-width:600px; margin:auto; background:#ffffff; padding:30px; border-radius:10px;">
            
            <h2 style="color:#2c3e50;">Welcome to ODRA BUILD 🚀</h2>

            <p>Hello,</p>

            <p>You have been assigned as a <strong>Site Engineer</strong> for the project:</p>

            <div style="background:#f0f3f7; padding:15px; border-radius:8px; margin:15px 0;">
                <strong>Project:</strong> ${title}<br/>
                <strong>Assigned By:</strong> ${contractor.name}
            </div>

            <p>Here are your login credentials:</p>

            <div style="background:#f8f9fa; padding:15px; border-radius:8px; font-size:14px;">
                <strong>Email:</strong> ${siteEngineerEmail}<br/>
                <strong>Temporary Password:</strong> ${tempPassword}
            </div>

            <div style="text-align:center; margin:25px 0;">
                <a href="https://odraopssaas.netlify.app/Login" 
                   style="background:#1abc9c; color:white; padding:12px 25px; 
                   text-decoration:none; border-radius:5px;">
                   Login to Dashboard
                </a>
            </div>

            <p style="color:#7f8c8d; font-size:13px;">
                For security reasons, please change your password after logging in.
            </p>

            <hr/>

            <p style="font-size:12px; color:#95a5a6;">
                © ${new Date().getFullYear()} PBM. All rights reserved.
            </p>
        </div>
    </div>
`; console.log("Sendign email")
            await sendEmail(
                siteEngineerEmail,
                `You’ve Been Assigned to Project "${title}"`,
                htmlContent,
                contractor.email   // 🔥 THIS IS KEY
            );
        }

        // 🏗 Create project (organization locked)
        const newProject = await Project.create({
            title,
            description,
            status: "Ongoing",
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : new Date(),
            siteEngineer: stEng._id,
            contractor: contractorId,
            organizationId
        });

        contractor.totalProjects += 1;
        await contractor.save();

        // Push project reference
        await User.findByIdAndUpdate(contractorId, {
            $push: { createdProjects: newProject._id }
        });

        await User.findByIdAndUpdate(stEng._id, {
            $push: { assignedProjects: newProject._id }
        });

        // 🔔 Real-time notify engineer
        const io = req.app.get("io");
        const roomName = `siteEngineer-${stEng._id.toString()}`;

        io.to(roomName).emit("project:assigned", {
            newProject,
            contractorName: contractor.name
        });


        return res.status(201).json({
            success: true,
            newProject,
            contractorName: contractor.name
        });

    } catch (error) {
        console.error("Create Project Error:", error);
        return res.status(500).json({
            success: false,
            error: "Internal Server Error"
        });
    }
};

// get all projects for contractor
exports.getProject = async (req, res) => {
    try {
        const contractorId = req.user.User_id;
        const contratProjects = await Project.find({ organizationId: req.user.organizationId }).populate('siteEngineer', 'name email').lean();

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
        const allProject = await Project.find({ siteEngineer: siteEngineerId, organizationId: req.user.organizationId })
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

// to get project by id so that both contractor and site engineer see the page and no other sees the page
exports.getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        // Ensure the requester is either contractor of project or assigned site engineer
        const project = await Project.findOne({ _id: id, organizationId: req.user.organizationId })
            .populate('contractor', 'name email')
            .populate('siteEngineer', 'name email')
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

        // notify the site engineer
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

// delete projects
exports.deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        const contractor_id = req.user.User_id;
        const organizationId = req.user.organizationId;
        const project = await Project.findOne({ _id: id, organizationId });
        const project_name = project.title;
        const siteEng_id = project.siteEngineer;

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        // 1 remove project from contractor
        await User.findOneAndUpdate({ _id: project.contractor, organizationId: organizationId }, {
            $pull: { createdProjects: id }
        })

        // 2️⃣ Remove project from site engineer
        await User.findOneAndUpdate({ _id: project.siteEngineer, organizationId }, {
            $pull: { assignedProjects: id }
        });

        // 3️⃣ Free workers (remove project reference)
        await Worker.updateMany(
            { currentProjectId: id },
            { $set: { currentProjectId: null, status: "free" } }
        );

        // 4️⃣ Delete reports
        await Report.deleteMany({ projectId: id, organizationId });

        // 5️⃣ Delete chats
        await ChatMessage.deleteMany({ projectId: id, organizationId });

        // 6️⃣ Delete inventory usage logs
        await InventoryUsage.deleteMany({ projectId: id, organizationId });

        // 7️⃣ Delete inventory items
        await InventoryItem.deleteMany({ projectId: id, organizationId });

        // 8 Delete project
        await Project.findOneAndDelete({ _id: id, organizationId });

        // 9 delete attendance
        await Project.deleteMany({ projectId: id, organizationId });

        // 🔔 Real-time notify engineer
        const io = req.app.get("io");
        const roomName = `siteEngineer-${siteEng_id.toString()}`;
        const roomName2 = `project-${id}`

        io.to(roomName).emit("project:deleted", {
            project_id: id,
            project_name
        });

        io.to(roomName2).emit("project:deleted", {
            project_id: id,
            project_name
        })


        return res.status(200).json({
            message: "Project deleted successfully"
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}

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

        const siteEng_id = project.siteEngineer;
        const roomName = `siteEngineer-${siteEng_id.toString()}`;

        // broadcast to project room
        io.to(`project-${projectId}`).emit("project:titleUpdated", {
            projectId,
            title
        });

        // broadcast to site eng room
        io.to(roomName).emit("project:titleUpdated", {
            projectId,
            title
        });

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