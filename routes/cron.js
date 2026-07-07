const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { runExport } = require('../jobs/exportJson');

router.get('/export', requireAuth, async (req, res) => {
  try {
    await runExport();
    res.json({ success: true, message: 'CDN export completed' });
  } catch (err) {
    console.error('[cron/export] Manual export failed:', err);
    res.status(500).json({ error: 'Export failed', detail: err.message });
  }
});

module.exports = router;
