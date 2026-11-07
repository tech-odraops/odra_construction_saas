
const { S3Client } = require("@aws-sdk/client-s3");

// aws s3 client config
const s3Client = new S3Client({
    region:process.env.AWS_REGION
});

// Bucket configuration
const bucketName = process.env.AWS_S3_BUCKET;

module.exports = {
    s3Client,
    bucketName
};