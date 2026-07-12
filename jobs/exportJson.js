const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Company = require('../models/Company');
const Venue = require('../models/Venue');

function getS3Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CDN_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CDN_ACCESS_KEY_ID,
      secretAccessKey: process.env.CDN_SECRET_ACCESS_KEY,
    },
  });
}

async function runExport() {
  const now = new Date();
  const activeFilter = {
    status: 'published',
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  };

  const [auditions, productions, companies, venues] = await Promise.all([
    Audition.find(activeFilter)
      .populate('linkedCompanyId', 'name slug city state region logoUrl website')
      .populate('linkedVenueId', 'name address city state zip mapUrl lat lng')
      .lean(),
    Production.find(activeFilter)
      .populate('linkedCompanyId', 'name slug city state region logoUrl website')
      .populate('linkedVenueId', 'name address city state zip mapUrl lat lng')
      .lean(),
    Company.find({ verified: true }).select('name slug city state region website logoUrl homeVenueIds').lean(),
    Venue.find().select('name address city state zip county region lat lng mapUrl website linkedCompanyId').lean(),
  ]);

  await Promise.all([
    uploadToCdn('auditions.json', auditions),
    uploadToCdn('productions.json', productions),
    uploadToCdn('companies.json', companies),
    uploadToCdn('venues.json', venues),
  ]);

  console.log(`[exportJson] Exported ${auditions.length} auditions, ${productions.length} productions, ${companies.length} companies, ${venues.length} venues`);
}

async function uploadToCdn(filename, data) {
  const { CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY, CDN_BUCKET_NAME } = process.env;

  if (!CDN_ACCOUNT_ID || !CDN_ACCESS_KEY_ID || !CDN_SECRET_ACCESS_KEY || !CDN_BUCKET_NAME) {
    console.warn(`[exportJson] CDN not configured — skipping upload of ${filename}`);
    return;
  }

  const client = getS3Client();
  await client.send(new PutObjectCommand({
    Bucket: CDN_BUCKET_NAME,
    Key: `data/${filename}`,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  }));
}

module.exports = { runExport };
