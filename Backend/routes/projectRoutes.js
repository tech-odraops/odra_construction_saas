const express = require('express');
const router = express.Router();
const projectController = require("../controllers/projectController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");

// create Project
router.post('/',authen,validateRoles("Founder"),projectController.createProject);

// get all project
router.get('/',authen,validateRoles("Founder"),projectController.getProject);

// get all project for the siteEn
router.get('/my-projects',authen,validateRoles("Site Engineer"),projectController.getProjectSE);

// get dashboard summary for contractor
router.get("/dashboard",authen, validateRoles("Founder"),projectController.getContractorDashboard);

// single project for contractor or Site Engineer
router.get('/:id',authen,validateRoles(["Founder","Site Engineer"]),projectController.getProjectById);

// complete project
router.post('/:projectId/complete',authen,validateRoles("Founder"),projectController.completeProject);

// get wage
router.get( "/:projectId/wages", authen,validateRoles(["Founder"]), projectController.getProjectWages);

// delete project 
router.delete("/:id", authen, validateRoles("Founder"), projectController.deleteProject);

// add miscellaneous item
router.post(
    "/:projectId/miscellaneous",
    authen,
    validateRoles("Site Engineer"),
    projectController.addMiscellaneousItem
);

// approve/reject miscellaneous item
router.patch(
    "/:projectId/miscellaneous/:itemId/status",
    authen,
    validateRoles("Founder"),
    projectController.updateMiscellaneousStatus
);

// patch request to update title
router.patch(
    "/:projectId/title",
    authen,
    validateRoles("Founder"),
    projectController.updateProjectTitle
)

module.exports = router;
