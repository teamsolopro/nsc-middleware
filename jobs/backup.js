/**
 * backup.js — Dumps all MongoDB collections to JSON and uploads to R2.
 *
 * Backup layout in R2:
 *   backups/YYYY-MM-DD/companies.json
 *   backups/YYYY-MM-DD/venues.json
 *   ... (all collections)
 *
 * Retention: backups older than RETENTION_DAYS are deleted automatically.
 */

const mongoose = require('mongoose');
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} = require('@aws-sdk/client-s3');

const RETENTION_DAYS = 30;

function getR2Client() {
  const { CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY } = process.env;
  if (!CDN_ACCOUNT_ID || !CDN_ACCESS_KEY_ID || !CDN_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials not configured');
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

async function runBackup() {
  const bucket = process.env.CDN_BUCKET_NAME;
  if (!bucket) throw new Error('CDN_BUCKET_NAME not configured');

  const db = mongoose.connection.db;
  const client = getR2Client();

  // Date prefix for this backup e.g. "2026-07-16"
  const today = new Date().toISOString().slice(0, 10);
  const prefix = `backups/${today}/`;

  // Get all collection names
  const collections = await db.listCollections().toArray();
  const names = collections.map(c => c.name).filter(n => !n.startsWith('system.'));

  console.log(`[backup] Starting backup for ${names.length} collections → ${prefix}`);

  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    const json = JSON.stringify(docs, null, 2);
    const key = `${prefix}${name}.json`;

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(json, 'utf8'),
      ContentType: 'application/json',
    }));

    console.log(`[backup]   ${name}: ${docs.length} docs → ${key}`);
  }

  console.log(`[backup] Backup complete.`);

  // ── Retention: delete backups older than RETENTION_DAYS ──
  await pruneOldBackups(client, bucket);
}

async function pruneOldBackups(client, bucket) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  // List all objects under backups/
  const listed = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: 'backups/',
  }));

  if (!listed.Contents || listed.Contents.length === 0) return;

  // Extract unique date prefixes e.g. "backups/2026-01-01/"
  const dates = new Set(
    listed.Contents
      .map(o => o.Key.match(/^backups\/(\d{4}-\d{2}-\d{2})\//))
      .filter(Boolean)
      .map(m => m[1])
  );

  const toDelete = [];
  for (const dateStr of dates) {
    const d = new Date(dateStr);
    if (d < cutoff) {
      const stale = listed.Contents.filter(o => o.Key.startsWith(`backups/${dateStr}/`));
      stale.forEach(o => toDelete.push({ Key: o.Key }));
    }
  }

  if (toDelete.length === 0) return;

  await client.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: toDelete },
  }));

  const days = [...new Set(toDelete.map(o => o.Key.split('/')[1]))];
  console.log(`[backup] Pruned ${toDelete.length} files from ${days.length} old backup(s): ${days.join(', ')}`);
}

module.exports = { runBackup };
