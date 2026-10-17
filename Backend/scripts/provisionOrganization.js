const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const readline = require("readline/promises");
const { stdin, stdout } = require("process");
const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const User = require("../models/user");
const Organization = require("../models/Organization");
const Invitation = require("../models/Invitation");

const rl = readline.createInterface({ input: stdin, output: stdout });

const ask = async (question) => (await rl.question(question)).trim();

const normalizeEmail = (email) => email.trim().toLowerCase();

const normalizeSlug = (slug) =>
    slug.trim().toLowerCase();

async function provisionOrganization() {
    let user;
    let organization;
    let invitation;

    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from Backend/.env");
        }

        const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, "");

        if (!appBaseUrl) {
            throw new Error("APP_BASE_URL is missing from Backend/.env");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("\n--- ODRAOPS Organization Provisioning ---\n");

        const organizationName = await ask("Company name: ");
        const slug = normalizeSlug(await ask("Subdomain slug (e.g. abc-builders): "));
        const ownerName = await ask("Founder name: ");
        const ownerEmail = normalizeEmail(await ask("Founder email: "));

        if (!organizationName || !ownerName || !ownerEmail || !slug) {
            throw new Error("All fields are required.");
        }

        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            throw new Error(
                "Invalid slug. Use lowercase letters, numbers, and single hyphens."
            );
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
            throw new Error("Please enter a valid email address.");
        }

        // This matches the current application's global email lookup behavior.
        const existingUser = await User.findOne({ email: ownerEmail });

        if (existingUser) {
            throw new Error(
                "A user with this email already exists. No records were created."
            );
        }

        const existingOrganization = await Organization.findOne({ slug });

        if (existingOrganization) {
            throw new Error(
                "This organization slug is already taken. Choose another."
            );
        }

        // Generate an unknown temporary password.
        // The founder will set their actual password through activation.
        const unusablePassword = crypto.randomBytes(48).toString("hex");
        const passwordHash = await bcrypt.hash(unusablePassword, 12);

        // The token is shown only once. Only its SHA-256 hash is stored.
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");

        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        user = await User.create({
            name: ownerName,
            email: ownerEmail,
            password: passwordHash,
            role: "Founder",
            status: "invited"
        });

        organization = await Organization.create({
            name: organizationName,
            slug,
            ownerId: user._id,
            status: "onboarding"
        });

        user.organizationId = organization._id;
        await user.save();

        invitation = await Invitation.create({
            organizationId: organization._id,
            email: ownerEmail,
            role: user.role,
            invitedBy: null,
            tokenHash,
            expiresAt,
            status: "invited"
        });

        const activationUrl =
            `${appBaseUrl}/activate-account?token=${rawToken}`;

        console.log("\nOrganization created successfully.");
        console.log(`Organization ID: ${organization._id}`);
        console.log(`Organization slug: ${slug}`);
        console.log(`Founder email: ${ownerEmail}`);
        console.log(`Invitation expires: ${expiresAt.toISOString()}`);
        console.log("\nActivation link (sensitive; share privately):");
        console.log(activationUrl);
        console.log(
            "\nIMPORTANT: The activation page/API must be implemented before this link can be used."
        );
        console.log("Do not run this script again for the same founder.");
    } catch (error) {
        // Best-effort cleanup if provisioning fails partway through.
        if (invitation?._id) {
            await Invitation.deleteOne({ _id: invitation._id }).catch(() => {});
        }

        if (organization?._id) {
            await Organization.deleteOne({ _id: organization._id }).catch(() => {});
        }

        if (user?._id) {
            await User.deleteOne({ _id: user._id }).catch(() => {});
        }

        console.error("\nProvisioning failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect().catch(() => {});
    }
}

provisionOrganization();
