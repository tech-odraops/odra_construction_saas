const isDateOnly = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isPositiveNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;
const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;

const allocateTransferReceiptCosts = (transfer, lines) => {
  const stagedReceived = new Map();
  const allocated = [];

  for (const line of lines) {
    let remaining = line.quantity;
    let totalCost = 0;
    const allocations = [];
    for (let dispatchIndex = 0; dispatchIndex < transfer.dispatches.length && remaining > 0; dispatchIndex += 1) {
      const dispatch = transfer.dispatches[dispatchIndex];
      for (let itemIndex = 0; itemIndex < dispatch.items.length && remaining > 0; itemIndex += 1) {
        const dispatchItem = dispatch.items[itemIndex];
        if (String(dispatchItem.materialId) !== String(line.materialId)) continue;
        const key = `${dispatchIndex}:${itemIndex}`;
        const alreadyAllocated = stagedReceived.get(key) || 0;
        const pending = dispatchItem.quantity - dispatchItem.receivedQuantity - alreadyAllocated;
        if (pending <= 0) continue;
        const quantity = Math.min(pending, remaining);
        stagedReceived.set(key, alreadyAllocated + quantity);
        allocations.push({ dispatchIndex, itemIndex, quantity });
        totalCost += quantity * dispatchItem.unitCost;
        remaining -= quantity;
      }
    }
    if (remaining > 0) return { error: "Received quantity exceeds the dispatched quantity" };
    allocated.push({
      ...line,
      unitCost: totalCost / line.quantity,
      allocations
    });
  }
  return allocated;
};

module.exports = {
  allocateTransferReceiptCosts,
  isDateOnly,
  isNonNegativeNumber,
  isPositiveNumber
};
