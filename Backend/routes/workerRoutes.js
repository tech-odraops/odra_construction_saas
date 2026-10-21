const express = require('express');
const router = express.Router();
const workersController = require("../controllers/workersController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");


// Create worker (Contractor only)
router.post('/', authen, validateRoles("Founder"), workersController.createWorker);

// Get workers for a project
router.get('/:projectId', authen, validateRoles(["Founder", "Site Engineer"]), workersController.getProjectWorkers);

// Get all workers
router.get('/', authen, validateRoles("Founder"), workersController.getAllWorkers);

// Assign worker to project
router.post('/:workerId/assign', authen, validateRoles("Founder"), workersController.assignWorkerToProject);

module.exports = router;
