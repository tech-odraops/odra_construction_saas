const express = require('express');
const router = express.Router();
const projectController = require("../controllers/projectController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");

// create Project
router.post('/',authen,validateRoles("manager"),projectController.createProject);

// get all project
router.get('/',authen,validateRoles("manager"),projectController.getProject);

// get all project for the siteEn
router.get('/my-projects',authen,validateRoles("site engineer"),projectController.getProjectSE);

// get dashboard summary for contractor
router.get("/dashboard",authen, validateRoles("manager"),projectController.getContractorDashboard);

// single project for contractor or site engineer
router.get('/:id',authen,validateRoles(["manager","site engineer"]),projectController.getProjectById);

// complete project
router.post('/:projectId/complete',authen,validateRoles("manager"),projectController.completeProject);

// get wage
router.get( "/:projectId/wages", authen,validateRoles(["manager"]), projectController.getProjectWages);

// delete project 
router.delete("/:id", authen, validateRoles("manager"), projectController.deleteProject);

// add miscellaneous item
router.post(
    "/:projectId/miscellaneous",
    authen,
    validateRoles("site engineer"),
    projectController.addMiscellaneousItem
);

// approve/reject miscellaneous item
router.patch(
    "/:projectId/miscellaneous/:itemId/status",
    authen,
    validateRoles("manager"),
    projectController.updateMiscellaneousStatus
);

// patch request to update title
router.patch(
    "/:projectId/title",
    authen,
    validateRoles("manager"),
    projectController.updateProjectTitle
)

module.exports = router;
