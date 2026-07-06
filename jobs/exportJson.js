const cron = require('node-cron');
const axios = require('axios');
const Audition = require('../models/Audition');
const Production = require('../models/Production');

async function runExport() {
  const now = new Date();
  const activeFilter = {
    status: 'published',
    $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
  };

  const [auditions, productions] = await Promise.all([
    Audition.find(activeFilter)
      .populate('linkedCompanyId', 'name slug city state region logoUrl website')
      .populate('linkedVenueId', 'name address city state zip mapUrl')
      .lean(),
    Production.find(activeFilter)
      .populate('linkedCompanyId', 'name slug city state region logoUrl website')
      .populate('linkedVenueId', 'name address city state zip mapUrl')
      .lean(),
  ]);

  await Promise.all([
    uploadToCdn('auditions.json', auditions),
    uploadToCdn('productions.json', productions),
  ]);

  console.log(`[exportJson] Exported ${auditions.length} auditions, ${productions.length} productions`);
}

async function uploadToCdn(filename, data) {
  const cdnUrl = process.env.CDN_BUCKET_URL;
  const token = process.env.CDN_WRITE_TOKEN;

  if (!cdnUrl || !token) {
    console.warn(`[exportJson] CDN not configured — skipping upload of ${filename}`);
    return;
  }

  await axios.put(`${cdnUrl}/${filename}`, JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
}

function startExportJob() {
  // Run immediately on startup, then every 30 minutes
  runExport().catch((err) => console.error('[exportJson] Initial export failed:', err));
  cron.schedule('*/30 * * * *', () => {
    runExport().catch((err) => console.error('[exportJson] Cron export failed:', err));
  });
  console.log('[exportJson] Export job scheduled (every 30 min)');
}

module.exports = { startExportJob, runExport };
