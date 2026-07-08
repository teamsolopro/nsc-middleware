#!/usr/bin/env node
/**
 * Upload static CDN assets (CSS, JS) to Cloudflare R2.
 *
 * Usage:
 *   node scripts/upload-cdn-assets.js           # upload everything
 *   node scripts/upload-cdn-assets.js nsc.css   # upload one file by name
 */

require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const CDN_DIR = path.join(__dirname, '..', 'cdn');

const MIME = {
  '.css': 'text/css',
  '.js':  'application/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function getClient() {
  const { CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY } = process.env;
  if (!CDN_ACCOUNT_ID || !CDN_ACCESS_KEY_ID || !CDN_SECRET_ACCESS_KEY) {
    console.error('Missing CDN credentials. Set CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY in .env');
    process.exit(1);
  }
  return new S3Client({
    region: 'auto',
    endpoint: `https://${CDN_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: CDN_ACCESS_KEY_ID,
      secretAccessKey: CDN_SECRET_ACCESS_KEY,
    },
  });
}

function walkDir(dir, fileList = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function upload(client, filePath) {
  const key = path.relative(CDN_DIR, filePath).replace(/\\/g, '/');
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  const body = fs.readFileSync(filePath);

  await client.send(new PutObjectCommand({
    Bucket: process.env.CDN_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=300', // 5-minute CDN cache for assets
  }));

  console.log(`  ✓ ${key}`);
}

async function main() {
  const filter = process.argv[2] || null;
  const client = getClient();

  let files = walkDir(CDN_DIR).filter(f => {
    // Skip the data/ folder — those are managed by the export job
    return !f.includes(path.join('cdn', 'data'));
  });

  if (filter) {
    files = files.filter(f => path.basename(f) === filter);
    if (files.length === 0) {
      console.error(`No file named "${filter}" found under cdn/`);
      process.exit(1);
    }
  }

  console.log(`Uploading ${files.length} file(s) to R2 bucket "${process.env.CDN_BUCKET_NAME}"...\n`);

  for (const file of files) {
    await upload(client, file);
  }

  console.log('\nDone.');
}

main().catch(err => {
  console.error('Upload failed:', err.message);
  process.exit(1);
});
