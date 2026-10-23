
const express = require("express");
const router = express.Router();

const activationController = require("../../controllers/activationController");

router.post("/activate-account", activationController.activateAccount);

module.exports = { activation: router };
