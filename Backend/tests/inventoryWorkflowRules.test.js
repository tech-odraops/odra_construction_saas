const assert = require("node:assert/strict");
const test = require("node:test");
const {
  allocateTransferReceiptCosts,
  isDateOnly,
  isNonNegativeNumber,
  isPositiveNumber
} = require("../utils/inventoryWorkflowRules");

test("validates date-only values without accepting normalized invalid dates", () => {
  assert.equal(isDateOnly("2024-02-29"), true);
  assert.equal(isDateOnly("2025-02-29"), false);
  assert.equal(isDateOnly("2025-13-01"), false);
  assert.equal(isDateOnly("2025-1-01"), false);
});

test("validates stock quantities and costs", () => {
  assert.equal(isPositiveNumber(1), true);
  assert.equal(isPositiveNumber("0.5"), true);
  assert.equal(isPositiveNumber(0), false);
  assert.equal(isPositiveNumber(-1), false);
  assert.equal(isPositiveNumber("nope"), false);
  assert.equal(isNonNegativeNumber(0), true);
  assert.equal(isNonNegativeNumber(-0.01), false);
});

test("allocates partial transfer receipts against dispatch cost snapshots", () => {
  const transfer = {
    dispatches: [
      { items: [{ materialId: "cement", quantity: 4, receivedQuantity: 2, unitCost: 10 }] },
      { items: [{ materialId: "cement", quantity: 5, receivedQuantity: 0, unitCost: 14 }] }
    ]
  };

  const [receipt] = allocateTransferReceiptCosts(transfer, [
    { materialId: "cement", quantity: 4 }
  ]);
  assert.equal(receipt.unitCost, 12);
  assert.deepEqual(receipt.allocations, [
    { dispatchIndex: 0, itemIndex: 0, quantity: 2 },
    { dispatchIndex: 1, itemIndex: 0, quantity: 2 }
  ]);
  assert.equal(transfer.dispatches[0].items[0].receivedQuantity, 2);
});

test("rejects transfer receipts exceeding dispatched quantities", () => {
  const result = allocateTransferReceiptCosts({
    dispatches: [{ items: [{ materialId: "steel", quantity: 2, receivedQuantity: 1, unitCost: 8 }] }]
  }, [{ materialId: "steel", quantity: 2 }]);
  assert.deepEqual(result, { error: "Received quantity exceeds the dispatched quantity" });
});
