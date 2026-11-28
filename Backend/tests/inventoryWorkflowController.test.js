const assert = require("node:assert/strict");
const test = require("node:test");
const InventoryItem = require("../models/inventoryItem");
const InventoryGoodsReceipt = require("../models/InventoryGoodsReceipt");
const InventoryIndent = require("../models/InventoryIndent");
const InventoryLocation = require("../models/InventoryLocation");
const InventoryMaterial = require("../models/InventoryMaterial");
const InventoryPurchase = require("../models/InventoryPurchase");
const InventoryPurchaseOrder = require("../models/InventoryPurchaseOrder");
const InventoryTransfer = require("../models/InventoryTransfer");
const InventoryUsage = require("../models/InventoryUsage");
const Project = require("../models/project");
const controller = require("../controllers/inventoryWorkflowController");
const inventoryController = require("../controllers/inventoryController");

const ids = {
  organization: "64b000000000000000000001",
  user: "64b000000000000000000002",
  source: "64b000000000000000000003",
  transfer: "64b000000000000000000004",
  material: "64b000000000000000000005",
  stock: "64b000000000000000000006",
  destination: "64b000000000000000000007",
  purchaseOrder: "64b000000000000000000008",
  receipt: "64b000000000000000000009"
};

const response = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const makeTransfer = () => ({
  _id: ids.transfer,
  organizationId: ids.organization,
  sourceLocationId: ids.source,
  destinationLocationId: "64b000000000000000000007",
  status: "approved",
  dispatches: [],
  items: [{
    materialId: ids.material,
    requestedQuantity: 3,
    dispatchedQuantity: 0,
    receivedQuantity: 0,
    unitCost: 0
  }],
  async save() {}
});

const makeRequest = (body) => ({
  params: { transferId: ids.transfer },
  body,
  user: {
    User_id: ids.user,
    organizationId: ids.organization,
    role: "Site Engineer"
  },
  app: { get: () => null }
});

test("dispatch endpoint atomically deducts source stock and stores its cost snapshot", async (t) => {
  const transfer = makeTransfer();
  const sourceLocation = {
    _id: ids.source,
    organizationId: ids.organization,
    type: "warehouse",
    isActive: true
  };
  const material = { _id: ids.material, name: "Cement", unit: "bag" };
  const stock = {
    _id: ids.stock,
    availableQuantity: 8,
    totalQuantity: 10,
    pricePerUnit: 125,
    organizationId: ids.organization,
    locationId: ids.source,
    materialId: ids.material
  };
  const dispatchedStock = { ...stock, availableQuantity: 5 };

  t.mock.method(InventoryTransfer, "findOne", async () => transfer);
  t.mock.method(InventoryLocation, "findOne", async () => sourceLocation);
  t.mock.method(InventoryMaterial, "find", async () => [material]);
  t.mock.method(InventoryItem, "findOne", async () => stock);
  t.mock.method(InventoryItem, "findOneAndUpdate", async (_filter, update) => {
    stock.availableQuantity += update.$inc.availableQuantity;
    return dispatchedStock;
  });

  const res = response();
  await controller.dispatchTransfer(makeRequest({
    items: [{ materialId: ids.material, quantity: 3 }]
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(stock.availableQuantity, 5);
  assert.equal(transfer.items[0].dispatchedQuantity, 3);
  assert.equal(transfer.items[0].unitCost, 125);
  assert.equal(transfer.dispatches[0].items[0].unitCost, 125);
});

test("dispatch endpoint rejects quantities exceeding available stock", async (t) => {
  const transfer = makeTransfer();
  const sourceLocation = {
    _id: ids.source,
    organizationId: ids.organization,
    type: "warehouse",
    isActive: true
  };
  const material = { _id: ids.material, name: "Cement", unit: "bag" };
  const stock = { _id: ids.stock, availableQuantity: 2 };

  t.mock.method(InventoryTransfer, "findOne", async () => transfer);
  t.mock.method(InventoryLocation, "findOne", async () => sourceLocation);
  t.mock.method(InventoryMaterial, "find", async () => [material]);
  t.mock.method(InventoryItem, "findOne", async () => stock);
  t.mock.method(InventoryItem, "findOneAndUpdate", async () => null);

  const res = response();
  await controller.dispatchTransfer(makeRequest({
    items: [{ materialId: ids.material, quantity: 3 }]
  }), res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.equal(transfer.items[0].dispatchedQuantity, 0);
});

test("transfer receipt rolls back stock and indent when transfer persistence fails", async (t) => {
  const transfer = makeTransfer();
  transfer.status = "in_transit";
  transfer.items[0].dispatchedQuantity = 3;
  transfer.dispatches = [{
    items: [{
      materialId: ids.material,
      quantity: 3,
      receivedQuantity: 0,
      unitCost: 125
    }]
  }];
  transfer.receipts = [];
  transfer.save = async () => {
    throw new Error("transfer persistence failed");
  };
  const destination = {
    _id: ids.destination,
    organizationId: ids.organization,
    type: "warehouse",
    isActive: true
  };
  const indent = {
    status: "sourcing",
    items: [{
      materialId: ids.material,
      requestedQuantity: 3,
      allocatedQuantity: 3,
      fulfilledQuantity: 0
    }],
    async save() {}
  };
  const createdStock = { _id: ids.stock };
  let deletedStockId;

  t.mock.method(InventoryTransfer, "findOne", async () => transfer);
  t.mock.method(InventoryLocation, "findOne", async () => destination);
  t.mock.method(InventoryIndent, "findOne", async () => indent);
  t.mock.method(InventoryMaterial, "find", async () => [
    { _id: ids.material, name: "Cement", unit: "bag" }
  ]);
  t.mock.method(InventoryItem, "findOne", async () => null);
  t.mock.method(InventoryItem, "create", async () => createdStock);
  t.mock.method(InventoryItem, "deleteOne", async ({ _id }) => {
    deletedStockId = _id;
  });

  const req = {
    params: { transferId: ids.transfer },
    body: { items: [{ materialId: ids.material, quantity: 3 }] },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Site Engineer"
    },
    app: { get: () => null }
  };
  const res = response();
  await controller.receiveTransfer(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(deletedStockId, ids.stock);
  assert.equal(indent.status, "sourcing");
  assert.equal(indent.items[0].fulfilledQuantity, 0);
  assert.equal(indent.items[0].allocatedQuantity, 3);
});

test("existing usage API rejects zero quantity before accessing project data", async () => {
  const req = {
    body: {
      projectId: ids.source,
      inventoryItemId: ids.stock,
      usedQty: 0,
      date: "2025-01-01"
    },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Site Engineer"
    }
  };
  const res = response();

  await inventoryController.logInventoryUsage(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test("founders can record stock usage with a comment", async (t) => {
  const project = {
    _id: ids.source,
    organizationId: ids.organization,
    contractor: ids.user,
    siteEngineers: [],
    status: "Active"
  };
  const item = {
    _id: ids.stock,
    locationId: ids.destination,
    materialId: ids.material,
    availableQuantity: 4,
    totalQuantity: 10,
    pricePerUnit: 25
  };
  let usagePayload;

  t.mock.method(Project, "findOne", async () => project);
  t.mock.method(InventoryItem, "findOneAndUpdate", async () => item);
  t.mock.method(InventoryUsage, "create", async (payload) => {
    usagePayload = payload;
    return payload;
  });

  const req = {
    body: {
      projectId: ids.source,
      inventoryItemId: ids.stock,
      usedQty: 2,
      date: "2025-01-01",
      comment: "Used for foundation"
    },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Founder"
    },
    app: { get: () => null }
  };
  const res = response();

  await inventoryController.logInventoryUsage(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(usagePayload.comment, "Used for foundation");
  assert.equal(usagePayload.usedQty, 2);
});

test("creating an indent broadcasts an update to its project room", async (t) => {
  const projectId = ids.source;
  const siteLocation = {
    _id: ids.destination,
    projectId,
    organizationId: ids.organization,
    type: "project_site",
    isActive: true
  };
  const project = {
    _id: projectId,
    organizationId: ids.organization,
    contractor: ids.user,
    siteEngineers: [],
    status: "Active"
  };
  let emittedEvent;

  t.mock.method(InventoryLocation, "findOne", async () => siteLocation);
  t.mock.method(Project, "findOne", async () => project);
  t.mock.method(InventoryMaterial, "find", async () => [
    { _id: ids.material, name: "Cement", unit: "bag" }
  ]);
  t.mock.method(InventoryIndent, "create", async (payload) => ({
    _id: ids.receipt,
    ...payload
  }));
  const io = {
    to(room) {
      return {
        emit(eventName, payload) {
          emittedEvent = { room, eventName, payload };
        }
      };
    }
  };
  const req = {
    body: {
      locationId: ids.destination,
      items: [{ materialId: ids.material, quantity: 4 }]
    },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Founder"
    },
    app: { get: () => io }
  };
  const res = response();
  await controller.createIndent(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(emittedEvent.room, `project-${projectId}`);
  assert.equal(emittedEvent.eventName, "inventory:indent-updated");
  assert.equal(emittedEvent.payload.action, "created");
  assert.equal(emittedEvent.payload.locationId, ids.destination);
});

test("goods receipt adds actual quantities and leaves a partial purchase order open", async (t) => {
  const warehouse = {
    _id: ids.destination,
    organizationId: ids.organization,
    type: "warehouse",
    isActive: true
  };
  const material = { _id: ids.material, name: "Cement", unit: "bag" };
  const purchaseOrder = {
    _id: ids.purchaseOrder,
    organizationId: ids.organization,
    locationId: ids.destination,
    indentId: null,
    status: "issued",
    vendorSnapshot: { name: "Supplier Ltd", contactName: "A. Contact" },
    items: [{
      materialId: ids.material,
      orderedQuantity: 5,
      receivedQuantity: 0,
      unitPrice: 125
    }],
    async save() {}
  };
  const receipt = { _id: ids.receipt };
  const createdStock = {
    _id: ids.stock,
    name: "Cement",
    unit: "bag",
    totalQuantity: 3,
    availableQuantity: 3,
    pricePerUnit: 125,
    toObject() {
      return { ...this };
    }
  };
  let stockPayload;
  let purchasePayload;

  t.mock.method(InventoryPurchaseOrder, "findOne", async () => purchaseOrder);
  t.mock.method(InventoryLocation, "findOne", async () => warehouse);
  t.mock.method(InventoryMaterial, "find", async () => [material]);
  t.mock.method(InventoryGoodsReceipt, "create", async () => receipt);
  t.mock.method(InventoryItem, "findOne", async () => null);
  t.mock.method(InventoryItem, "create", async (payload) => {
    stockPayload = payload;
    return createdStock;
  });
  t.mock.method(InventoryPurchase, "create", async (payload) => {
    purchasePayload = payload;
    return {};
  });

  const req = {
    body: {
      purchaseOrderId: ids.purchaseOrder,
      receivedDate: "2025-03-04",
      items: [{ materialId: ids.material, receivedQuantity: 3 }]
    },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Site Engineer"
    },
    app: { get: () => null }
  };
  const res = response();
  await controller.createGoodsReceipt(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(purchaseOrder.status, "partially_received");
  assert.equal(purchaseOrder.items[0].receivedQuantity, 3);
  assert.equal(stockPayload.locationId, ids.destination);
  assert.equal(stockPayload.projectId, null);
  assert.equal(stockPayload.availableQuantity, 3);
  assert.equal(purchasePayload.goodsReceiptId, ids.receipt);
  assert.equal(purchasePayload.quantity, 3);
});

test("goods receipt failure removes its stock and receipt records", async (t) => {
  const warehouse = {
    _id: ids.destination,
    organizationId: ids.organization,
    type: "warehouse",
    isActive: true
  };
  const material = { _id: ids.material, name: "Cement", unit: "bag" };
  const purchaseOrder = {
    _id: ids.purchaseOrder,
    organizationId: ids.organization,
    locationId: ids.destination,
    indentId: null,
    status: "issued",
    vendorSnapshot: { name: "Supplier Ltd", contactName: "A. Contact" },
    items: [{
      materialId: ids.material,
      orderedQuantity: 5,
      receivedQuantity: 0,
      unitPrice: 125
    }],
    async save() {}
  };
  const receipt = { _id: ids.receipt };
  const createdStock = { _id: ids.stock };
  let deletedStockId;
  let deletedReceiptId;

  t.mock.method(console, "error", () => {});
  t.mock.method(InventoryPurchaseOrder, "findOne", async () => purchaseOrder);
  t.mock.method(InventoryLocation, "findOne", async () => warehouse);
  t.mock.method(InventoryMaterial, "find", async () => [material]);
  t.mock.method(InventoryGoodsReceipt, "create", async () => receipt);
  t.mock.method(InventoryGoodsReceipt, "deleteOne", async ({ _id }) => {
    deletedReceiptId = _id;
  });
  t.mock.method(InventoryItem, "findOne", async () => null);
  t.mock.method(InventoryItem, "create", async () => createdStock);
  t.mock.method(InventoryItem, "deleteOne", async ({ _id }) => {
    deletedStockId = _id;
  });
  t.mock.method(InventoryPurchase, "create", async () => {
    throw new Error("purchase ledger unavailable");
  });
  t.mock.method(InventoryPurchase, "deleteMany", async () => ({ deletedCount: 0 }));

  const req = {
    body: {
      purchaseOrderId: ids.purchaseOrder,
      receivedDate: "2025-03-04",
      items: [{ materialId: ids.material, receivedQuantity: 3 }]
    },
    user: {
      User_id: ids.user,
      organizationId: ids.organization,
      role: "Site Engineer"
    },
    app: { get: () => null }
  };
  const res = response();
  await controller.createGoodsReceipt(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(deletedStockId, ids.stock);
  assert.equal(deletedReceiptId, ids.receipt);
  assert.equal(purchaseOrder.status, "issued");
  assert.equal(purchaseOrder.items[0].receivedQuantity, 0);
});
