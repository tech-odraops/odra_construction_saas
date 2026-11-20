const assert = require("node:assert/strict");
const test = require("node:test");
const Asset = require("../models/Asset");

const ids = {
    project: "64b000000000000000000001",
    task: "64b000000000000000000002",
    user: "64b000000000000000000003",
    organization: "64b000000000000000000004"
};

const sharedFields = {
    projectId: ids.project,
    taskId: ids.task,
    uploaderId: ids.user,
    projectFounderId: ids.user,
    organizationId: ids.organization,
    sizeMB: 0.25
};

test("image assets require an image key and store uploadedOn", () => {
    const asset = new Asset({
        ...sharedFields,
        imageKey: "projects/image.webp"
    });

    assert.equal(asset.validateSync(), undefined);
    assert.equal(asset.assetType, "image");
    assert.ok(asset.uploadedOn instanceof Date);
});

test("file assets require an allowed file type and file key", () => {
    const validFile = new Asset({
        ...sharedFields,
        assetType: "file",
        fileKey: "projects/document.pdf",
        fileType: "pdf"
    });
    const invalidFile = new Asset({
        ...sharedFields,
        assetType: "file",
        fileKey: "projects/document.exe",
        fileType: "exe"
    });

    assert.equal(validFile.validateSync(), undefined);
    assert.ok(invalidFile.validateSync().errors.fileType);
});

test("asset tags are capped at 20", () => {
    const asset = new Asset({
        ...sharedFields,
        imageKey: "projects/image.webp",
        tags: Array.from({ length: 21 }, (_, index) => `tag-${index}`)
    });

    assert.ok(asset.validateSync().errors.tags);
});
