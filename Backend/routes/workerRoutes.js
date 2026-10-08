const express = require('express');
const router = express.Router();
const workersController = require("../controllers/workersController");
const {validateRoles} = require("../middleware/roles");
const {authen} = require("../middleware/tokenValidatorsMiddleware");


// Create worker (Contractor only)
router.post('/', authen, validateRoles("manager"), workersController.createWorker);

// Get workers for a project
router.get('/:projectId', authen, validateRoles(["manager", "site engineer"]), workersController.getProjectWorkers);

// Get all workers
router.get('/', authen, validateRoles("manager"), workersController.getAllWorkers);

// Assign worker to project
router.post('/:workerId/assign', authen, validateRoles("manager"), workersController.assignWorkerToProject);

module.exports = router;

