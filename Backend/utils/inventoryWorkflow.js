const mongoose = require("mongoose");
const Project = require("../models/project");
const InventoryItem = require("../models/inventoryItem");
const InventoryLocation = require("../models/InventoryLocation");

const getAuthorizedProject = async (projectId, user) => {
  if (!mongoose.isValidObjectId(projectId)) {
    return { error: { status: 400, message: "Invalid project ID" } };
  }

  const project = await Project.findOne({
    _id: projectId,
    organizationId: user.organizationId
  });

  if (!project) {
    return { error: { status: 404, message: "Project not found" } };
  }

  const userId = String(user.User_id);
  const isProjectMember =
    (user.role === "Founder" && String(project.contractor) === userId) ||
    (user.role === "Site Engineer" &&
      project.siteEngineers?.some((engineerId) => String(engineerId) === userId));

  if (!isProjectMember) {
    return { error: { status: 403, message: "You are not authorized to access this project" } };
  }

  return { project };
};

const getProjectLocation = async (project) => {
  const filter = {
    organizationId: project.organizationId,
    projectId: project._id,
    type: "project_site"
  };
  let location;
  try {
    location = await InventoryLocation.findOneAndUpdate(
      filter,
      {
        $set: { name: project.title, isActive: true },
        $setOnInsert: { createdBy: project.contractor }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    location = await InventoryLocation.findOne(filter);
    if (!location) throw error;
  }

  await InventoryItem.updateMany(
    {
      projectId: project._id,
      organizationId: project.organizationId,
      $or: [{ locationId: null }, { locationId: { $exists: false } }]
    },
    { $set: { locationId: location._id } }
  );

  return location;
};

const getAccessibleLocation = async (locationId, user) => {
  if (!mongoose.isValidObjectId(locationId)) {
    return { error: { status: 400, message: "Invalid location ID" } };
  }

  const location = await InventoryLocation.findOne({
    _id: locationId,
    organizationId: user.organizationId,
    isActive: true
  });
  if (!location) {
    return { error: { status: 404, message: "Inventory location not found" } };
  }

  let project = null;
  if (location.type === "project_site") {
    const access = await getAuthorizedProject(location.projectId, user);
    if (access.error) return access;
    project = access.project;
  } else if (!["Founder", "Site Engineer"].includes(user.role)) {
    return { error: { status: 403, message: "You are not authorized to access this location" } };
  }

  return { location, project };
};

const findStockItem = async (location, material) => {
  const filter = {
    organizationId: location.organizationId,
    locationId: location._id,
    materialId: material._id
  };
  let item = await InventoryItem.findOne(filter);

  if (!item && location.projectId) {
    item = await InventoryItem.findOne({
      organizationId: location.organizationId,
      projectId: location.projectId,
      materialId: material._id
    });

    if (!item) {
      item = await InventoryItem.findOne({
        organizationId: location.organizationId,
        projectId: location.projectId,
        name: material.name.trim().toLowerCase(),
        unit: material.unit.trim().toLowerCase()
      });
    }

    if (item) {
      item.locationId = location._id;
      item.materialId = material._id;
      await item.save();
    }
  }

  return item;
};

const addStock = async ({
  location,
  material,
  quantity,
  unitCost,
  userId,
  supplierName = "Internal transfer",
  companyName = "Internal transfer"
}) => {
  let item = await findStockItem(location, material);

  if (!item) {
    item = await InventoryItem.create({
      projectId: location.projectId || null,
      locationId: location._id,
      materialId: material._id,
      organizationId: location.organizationId,
      name: material.name,
      supplierName,
      companyName,
      unit: material.unit,
      pricePerUnit: unitCost,
      totalQuantity: quantity,
      availableQuantity: quantity,
      createdBy: userId
    });
    return item;
  }

  const availableAfter = item.availableQuantity + quantity;
  item.pricePerUnit =
    availableAfter > 0
      ? (item.availableQuantity * item.pricePerUnit + quantity * unitCost) / availableAfter
      : unitCost;
  item.totalQuantity += quantity;
  item.availableQuantity = availableAfter;
  item.supplierName = supplierName;
  item.companyName = companyName;
  await item.save();
  return item;
};

module.exports = {
  addStock,
  findStockItem,
  getAccessibleLocation,
  getAuthorizedProject,
  getProjectLocation
};
