const assert = require("node:assert/strict");
const test = require("node:test");

const Asset = require("../models/Asset");
const Organization = require("../models/Organization");
const Project = require("../models/project");
const controller = require("../controllers/assetController");

const ids = {
    organization: "64b000000000000000000001",
    founder: "64b000000000000000000002",
    firstProject: "64b000000000000000000003",
    secondProject: "64b000000000000000000004"
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

test("global asset listing is scoped to the Founder's projects and searches filenames and tags", async (t) => {
    const projects = [
        { _id: ids.firstProject, title: "Legacy Site Project" },
        { _id: ids.secondProject, title: "Lakeside Office Renovation" }
    ];
    let projectFilter;
    let assetFilter;

    t.mock.method(Organization, "findOne", () => ({
        select: async () => ({ _id: ids.organization })
    }));
    t.mock.method(Project, "find", (filter) => {
        projectFilter = filter;
        return { select: async () => projects };
    });
    t.mock.method(Asset, "find", (filter) => {
        assetFilter = filter;
        return {
            sort() { return this; },
            skip() { return this; },
            async limit() { return []; }
        };
    });
    t.mock.method(Asset, "countDocuments", async () => 0);

    const res = response();
    await controller.listAssets({
        query: {
            assetType: "file",
            search: "l",
            page: "1",
            limit: "20"
        },
        user: {
            User_id: ids.founder,
            organizationId: ids.organization,
            role: "Founder"
        }
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(projectFilter, {
        organizationId: ids.organization,
        contractor: ids.founder
    });
    assert.equal(assetFilter.assetType, "file");
    assert.deepEqual(assetFilter.projectId.$in, [ids.firstProject, ids.secondProject]);
    assert.equal(assetFilter.$or[0].originalName.source, "l");
    assert.equal(assetFilter.$or[1].tags.source, "l");
    assert.equal(assetFilter.$or.length, 2);
    assert.deepEqual(res.body.assets, []);
});
