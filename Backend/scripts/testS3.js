
require("dotenv").config();

const {
    uploadImage,
    getImageUrl,
    deleteImage
} = require("../services/s3Service");

const testS3 = async () => {
    let uploadedKey;

    try {
        // A valid 1x1 PNG image
        const imageBuffer = Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/F2sAAAAASUVORK5CYII=",
            "base64"
        );

        console.log("Uploading test image...");

        const result = await uploadImage({
            file: {
                buffer: imageBuffer,
                originalname: "test.png",
                mimetype: "image/png",
                size: imageBuffer.length
            },
            folder: "s3-integration-tests"
        });

        uploadedKey = result.key;

        console.log("Upload successful:", uploadedKey);

        console.log("Generating pre-signed URL...");

        const url = await getImageUrl(uploadedKey);

        console.log("Pre-signed URL generated:", Boolean(url));

        console.log("Deleting test image...");

        await deleteImage(uploadedKey);

        console.log("Test image deleted successfully.");

        console.log("AWS S3 integration test completed successfully!");

    } catch (error) {
        console.error("AWS S3 integration test failed:", error);

        if (uploadedKey) {
            try {
                await deleteImage(uploadedKey);
                console.log("Test image cleaned up.");
            } catch (cleanupError) {
                console.error("Cleanup failed:", cleanupError.message);
            }
        }

        process.exitCode = 1;
    }
};

testS3();
