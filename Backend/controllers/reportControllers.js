const Project = require('../models/project');
const User = require('../models/user');
const Report = require('../models/report');
const axios = require("axios");
const FormData = require("form-data");

const { sendToUser } = require("../services/notification.service");

exports.createReport = async (req, res) => {
    try {
        const { projectId, workDone, issuesFound, images = [] } = req.body;
        const siteEngineerId = req.user.User_id;


        // validate projects
        const projectDetails = await Project.findOne({ _id: projectId, organizationId: req.user.organizationId });
        if (!projectDetails) {
            return res.status(404).json({ message: 'Project does not exit' });
        }

        // check if the project is completed
        if (projectDetails.status === "Completed") {
            return res.status(400).json({ message: 'Project is completed' });
        }

        // check if this site engineer is allowed to for this project
        const assignedSiteEngineerIds = [
            ...(Array.isArray(projectDetails.siteEngineers) ? projectDetails.siteEngineers : []),
            projectDetails.siteEngineer
        ]
            .filter(Boolean)
            .map((assignedSiteEngineerId) => assignedSiteEngineerId.toString());

        if (!assignedSiteEngineerIds.includes(siteEngineerId.toString())) {
            return res.status(403).json({ message: 'You are not assigned to this project' });
        }

        const siteEngineer = await User.findOne({ _id: siteEngineerId, organizationId: req.user.organizationId });
        const siteEngName = siteEngineer?.name;


        const newReport = await Report.create({
            projectId,
            siteEngineerId,
            workDone,
            issuesFound,
            images,
            organizationId: req.user.organizationId
        })

        // push reports into the projects
        projectDetails.reports.push(newReport._id);
        await projectDetails.save();

        // emit socket io to client
        const io = req.app.get('io');
        if (io) {
            // inform contractor that a report was posted
            io.to(`contractor-${projectDetails.contractor._id.toString()}`).emit('report:new', {
                siteEngName,
                projectTitle: projectDetails.title,
                projectId,
                newReport
            })

            // also send to the project room if contractor is in the project page
            io.to(`project-${projectId}`).emit('report:new', {
                siteEngName,
                projectTitle: projectDetails.title,
                projectId,
                newReport
            })
        }

        // Fetch contractor's FCM token
        const contractor = await User.findById(
            projectDetails.contractor
        ).select("fcmToken");

        // Send Push Notification
        await sendToUser({
            token: contractor.fcmToken,
            title: projectDetails.title,
            body: `${siteEngName} submitted today's DPR`,
            data: {
                type: "dpr",
                projectId: projectDetails._id,
                reportId: newReport._id,
                url: `/contractor/view-report/${newReport._id}`
            }
        });

        return res.status(201).json({ "report": newReport, "message": "Report Created Successfully" });


    } catch (error) {
        return res.status(500).json({ "success": false, "message": "Server Error" });
    }
}

// review Report
exports.reviewReport = async (req, res) => {
    try {
        const reportId = req.params.reportId;
        const { contractorStatus, contractorComment } = req.body;
        const contractorId = req.user.User_id;

        const report = await Report.findOne({ _id: reportId, organizationId: req.user.organizationId }).populate("projectId");
        if (!report) return res.status(404).json({ message: 'Report not found' });

        // check if this is the valid contractor to review the report
        if (report.projectId.contractor.toString() !== contractorId) {
            return res.status(404).json({ "message": "Not Authorized to review the report" });
        }

        report.contractorComment = contractorComment;
        if (['approved', 'declined', 'pending'].includes(contractorStatus)) {
            report.contractorStatus = contractorStatus;
        }
        await report.save();

        // notify the site engineer
        const io = req.app.get('io');
        if (io) {
            io.to(`siteEngineer-${report.siteEngineerId.toString()}`).emit('report:reviewed', {
                reportId: report._id,
                contractorComment: report.contractorComment,
                contractorStatus: report.contractorStatus,
            });

            // also to project room
            io.to(`project-${report.projectId._id.toString()}`).emit('report:reviewed', {
                reportId: report._id,
                contractorComment: report.contractorComment,
                contractorStatus: report.contractorStatus,
            });
        }
        return res.status(202).json({ "message": "Reviewed Succefully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

// get report by id
exports.getReportById = async (req, res) => {
    try {
        const reportId = req.params.id;
        if (!reportId) {
            return res.status(400).json({ message: 'Report ID is required' });
        }

        const report = await Report.findOne({ _id: reportId, organizationId: req.user.organizationId }).populate("projectId").populate("siteEngineerId");

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }
        return res.status(200).json({ success: true, message: "Report fetched successfully", report });

    } catch (error) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
}

// Ai summary report 
exports.generateAISummary = async (req, res) => {
    try {
        const { reportId } = req.params;
        const report = await Report.findOne({
            _id: reportId,
            organizationId: req.user.organizationId
        });

        if (!report) {
            return res.status(404).json({ message: "Report not found" });
        }

        // if (report.aiSummary) {
        //     return res.status(200).json({
        //         message: "AI Summary already exists",
        //         aiSummary: report.aiSummary
        //     });
        // }

        const prompt = `
You are a construction assistant.

Work Done: ${report.workDone}
Issues: ${report.issuesFound || "None"}

STRICT RULES:
- Return ONLY valid JSON
- Do NOT use backticks
- Do NOT add explanation
- Give short explanation not too long.

Format:
{
  "workCompletedSummary": "",
  "issuesSummary": "",
  "overallStatus": ""
}
`;

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "user", content: prompt }
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://odraops.com", // required
                    "X-Title": "OdraOps SaaS"              // optional
                },
            }
        );

        console.log("Backend Output = ", response.data.choices[0].message.content)
        const aiText = JSON.parse(response.data.choices[0].message.content);

        //save to db
        report.aiSummary = aiText;
        await report.save();

        console.log(aiText);

        return res.status(200).json({
            message: "AI summary generated",
            aiSummary: aiText
        });


    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "AI summarization failed" });
    }
}

// voiceToText
exports.voiceToTextTest = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No audio uploaded"
            });
        }

        const formData = new FormData();

        formData.append(
            "file",
            req.file.buffer,
            {
                filename: "recording.webm",
                contentType: req.file.mimetype
            }
        );

        formData.append("model", "saaras:v3");
        formData.append("mode", "translate");
        formData.append("language_code", "od-IN");

        const response = await axios.post(
            "https://api.sarvam.ai/speech-to-text",
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    "api-subscription-key": process.env.SARVAM_API_KEY
                }
            }
        );

        console.log("Sarvam Output = ", response.data);

        const transcript = response.data.transcript;
        const prompt = `
You are a construction report assistant.

From the following site engineer transcript:

1. Extract completed work into "workDone"
2. Extract problems, delays, damages, shortages, accidents, or pending work into "issuesFound"

IMPORTANT RULES:
- Return ONLY valid JSON
- Do NOT use backticks
- If no issue exists, set issuesFound to "No issues reported"
- Keep responses short and professional

Transcript:
${transcript}

Format:
{
  "workDone": "",
  "issuesFound": ""
}
`;
        const aiResponse = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://odraops.com",
                    "X-Title": "OdraOps SaaS"
                }
            }
        );
        
        let structuredData;

        try {
            structuredData = JSON.parse(
                aiResponse.data.choices[0].message.content
            );
        } catch {
           return res.status(500).json({error:"Can not parse into json"});
        }

        return res.status(200).json({
            success: true,
            transcript,
            structuredData
        });

    } catch (error) {

        console.log(error.response?.data || error.message);

        res.status(500).json({
            success: false,
            message:
                error.response?.data?.detail ||
                error.message ||
                "Voice to text failed",
        });
    }
};