const { S3Client } = require('@aws-sdk/client-s3');

// Reads AWS credentials from env. If AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
// aren't set, the SDK falls back to the default provider chain (IAM role,
// shared credentials file, etc.) - handy on EC2/ECS where you don't want
// keys in .env at all.
const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
});

const BUCKET = process.env.AWS_BUCKET_NAME;

module.exports = { s3, BUCKET };
