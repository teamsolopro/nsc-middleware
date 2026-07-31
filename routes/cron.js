const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { runExport } = require('../jobs/exportJson');
const { runBackup } = require('../jobs/backup');
const { runArchive } = require('../jobs/archiveOld');

router.get('/export', requireAuth, async (req, res) => {
  try {
    await runExport();
    res.json({ success: true, message: 'CDN export completed' });
  } catch (err) {
    console.error('[cron/export] Manual export failed:', err);
    res.status(500).json({ error: 'Export failed', detail: err.message });
  }
});

router.get('/backup', requireAuth, async (req, res) => {
  try {
    await runBackup();
    res.json({ success: true, message: 'Backup completed' });
  } catch (err) {
    console.error('[cron/backup] Manual backup failed:', err);
    res.status(500).json({ error: 'Backup failed', detail: err.message });
  }
});

router.get('/archive', requireAuth, async (req, res) => {
  try {
    const result = await runArchive();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[cron/archive] Manual archive failed:', err);
    res.status(500).json({ error: 'Archive failed', detail: err.message });
  }
});

module.exports = router;
