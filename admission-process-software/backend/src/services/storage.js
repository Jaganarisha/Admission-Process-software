const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const env = require('../config/env');

// Amazon S3 in production (S3_BUCKET set), local disk in development.
// Credentials are resolved by the AWS SDK default chain (IAM role on EC2 / Elastic Beanstalk) - never hard-coded.
let s3Client;
const s3 = () => {
  if (!s3Client) {
    const { S3Client } = require('@aws-sdk/client-s3');
    s3Client = new S3Client({ region: env.storage.region });
  }
  return s3Client;
};

const localPath = (key) => {
  const full = path.resolve(env.storage.localDir, key);
  if (!full.startsWith(path.resolve(env.storage.localDir) + path.sep)) throw new Error('Invalid storage key');
  return full;
};

async function put(key, buffer, contentType) {
  if (env.storage.driver === 's3') {
    const { PutObjectCommand } = require('@aws-sdk/client-s3');
    await s3().send(new PutObjectCommand({ Bucket: env.storage.bucket, Key: key, Body: buffer, ContentType: contentType, ServerSideEncryption: 'AES256' }));
    return;
  }
  const full = localPath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
}

async function getStream(key) {
  if (env.storage.driver === 's3') {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const out = await s3().send(new GetObjectCommand({ Bucket: env.storage.bucket, Key: key }));
    return out.Body;
  }
  return fsSync.createReadStream(localPath(key));
}

async function remove(key) {
  if (env.storage.driver === 's3') {
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
    await s3().send(new DeleteObjectCommand({ Bucket: env.storage.bucket, Key: key }));
    return;
  }
  await fs.rm(localPath(key), { force: true });
}

module.exports = { put, getStream, remove };
