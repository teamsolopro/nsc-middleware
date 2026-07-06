const express = require('express');
const router = express.Router();
const { validateWebhook } = require('../middleware/validateWebhook');
const Audition = require('../models/Audition');
const Production = require('../models/Production');

router.post('/audition', validateWebhook, async (req, res) => {
  try {
    const data = req.body;
    // TODO: map GHL form field names to Audition schema fields
    const audition = new Audition({
      show: { title: data.show_title || data['show-title'] || 'Untitled' },
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      submittedByEmail: data.email,
      // Additional field mapping goes here once GHL form fields are finalized
    });
    await audition.save();
    console.log(`New audition submission: ${audition._id}`);
    res.status(200).json({ received: true, id: audition._id });
  } catch (err) {
    console.error('Webhook /audition error:', err);
    res.status(500).json({ error: 'Failed to save audition submission' });
  }
});

router.post('/production', validateWebhook, async (req, res) => {
  try {
    const data = req.body;
    // TODO: map GHL form field names to Production schema fields
    const production = new Production({
      show: { title: data.show_title || data['show-title'] || 'Untitled' },
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      submittedByEmail: data.email,
      // Additional field mapping goes here once GHL form fields are finalized
    });
    await production.save();
    console.log(`New production submission: ${production._id}`);
    res.status(200).json({ received: true, id: production._id });
  } catch (err) {
    console.error('Webhook /production error:', err);
    res.status(500).json({ error: 'Failed to save production submission' });
  }
});

module.exports = router;
