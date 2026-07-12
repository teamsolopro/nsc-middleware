const express = require('express');
const router = express.Router();
const { validateWebhook } = require('../middleware/validateWebhook');
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Review = require('../models/Review');
const Company = require('../models/Company');
const Venue = require('../models/Venue');
const stripPrice = v => v ? parseFloat(v.replace(/[^0-9.]/g, '')) || v : undefined;

// ─── Show submission ───────────────────────────────────────
router.post('/submit-show', validateWebhook, async (req, res) => {
  try {
    const d = req.body;
    const production = new Production({
      linkedCompanyId: d.linkedCompanyId || undefined,
      linkedVenueId:   d.linkedVenueId   || undefined,
      show: {
        title:           d.title,
        author:          d.author,
        composer:        d.composer         || undefined,
        description:     d.marketingDescription,
        type:            Array.isArray(d.showType) ? d.showType[0] : d.showType,
        showType:        Array.isArray(d.showType) ? d.showType : (d.showType ? [d.showType] : []),
        familyRating:    d.familyRating    || undefined,
        runtime:         d.runtime         || undefined,
        contentWarnings: d.contentWarnings || undefined,
      },
      dates: {
        opens:  d.runDates && d.runDates.start ? new Date(d.runDates.start) : undefined,
        closes: d.runDates && d.runDates.end   ? new Date(d.runDates.end)   : undefined,
      },
      tickets: {
        generalAdmission: d.ticketPrices && d.ticketPrices.general ? stripPrice(d.ticketPrices.general) : undefined,
        senior:           d.ticketPrices && d.ticketPrices.senior  ? stripPrice(d.ticketPrices.senior)  : undefined,
        student:          d.ticketPrices && d.ticketPrices.student ? stripPrice(d.ticketPrices.student) : undefined,
        child:            d.ticketPrices && d.ticketPrices.child   ? stripPrice(d.ticketPrices.child)   : undefined,
        bookingUrl:       d.ticketUrl        || undefined,
        boxOfficePhone:   d.boxOfficePhone   || undefined,
        notes:            d.ticketNotes      || undefined,
      },
      contactName:      d.contactName,
      contactEmail:     d.contactEmail,
      contactPhone:     d.contactPhone      || undefined,
      submittedByEmail: d.contactEmail,
      status: 'pending',
    });
    await production.save();
    console.log(`[webhook] New show submission: ${production._id} — ${d.title}`);
    res.status(200).json({ received: true, id: production._id });
  } catch (err) {
    console.error('[webhook] /submit-show error:', err);
    res.status(500).json({ error: 'Failed to save show submission' });
  }
});

// ─── Company submission (from Add New Company modal) ───────
router.post('/submit-company', validateWebhook, async (req, res) => {
  try {
    const d = req.body;
    const slug = d.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const company = new Company({
      name:         d.name,
      slug:         slug + '-' + Date.now(),
      city:         d.city         || undefined,
      state:        d.state        || undefined,
      region:       d.region       || undefined,
      website:      d.website      || undefined,
      contactName:  d.contactName,
      contactEmail: d.contactEmail,
      contactPhone: d.contactPhone || undefined,
      verified:     false,
    });
    await company.save();
    console.log(`[webhook] New company submission: ${company._id} — ${d.name}`);
    res.status(200).json({ received: true, id: company._id, name: company.name });
  } catch (err) {
    console.error('[webhook] /submit-company error:', err);
    res.status(500).json({ error: 'Failed to save company submission' });
  }
});

// ─── Venue submission (from Add New Venue modal) ───────────
router.post('/submit-venue', validateWebhook, async (req, res) => {
  try {
    const d = req.body;
    const venue = new Venue({
      name:            d.name,
      address:         d.address      || undefined,
      city:            d.city         || undefined,
      state:           d.state        || undefined,
      zip:             d.zip          || undefined,
      county:          d.county       || undefined,
      region:          d.region       || undefined,
      website:         d.website      || undefined,
      parkingNotes:    d.parkingNotes || undefined,
    });
    await venue.save();
    console.log(`[webhook] New venue submission: ${venue._id} — ${d.name}`);
    res.status(200).json({ received: true, id: venue._id, name: venue.name });
  } catch (err) {
    console.error('[webhook] /submit-venue error:', err);
    res.status(500).json({ error: 'Failed to save venue submission' });
  }
});

// ─── Audition submission ───────────────────────────────────
router.post('/submit-audition', validateWebhook, async (req, res) => {
  try {
    const d = req.body;
    const audition = new Audition({
      show: { title: d.show_title || d.title || 'Untitled' },
      contactName:      d.contactName,
      contactEmail:     d.contactEmail,
      contactPhone:     d.contactPhone,
      submittedByEmail: d.contactEmail,
    });
    await audition.save();
    console.log(`[webhook] New audition submission: ${audition._id}`);
    res.status(200).json({ received: true, id: audition._id });
  } catch (err) {
    console.error('[webhook] /submit-audition error:', err);
    res.status(500).json({ error: 'Failed to save audition submission' });
  }
});

// ─── Review submission ─────────────────────────────────────
router.post('/submit-review', validateWebhook, async (req, res) => {
  try {
    const d = req.body;
    const review = new Review({
      reviewType:        'guest',
      linkedProductionId: d.production_id,
      reviewerName:      d.reviewer_name || d.name,
      reviewerEmail:     d.email,
      rating:            d.rating,
      body:              d.body || d.review_body,
    });
    await review.save();
    console.log(`[webhook] New review submission: ${review._id}`);
    res.status(200).json({ received: true, id: review._id });
  } catch (err) {
    console.error('[webhook] /submit-review error:', err);
    res.status(500).json({ error: 'Failed to save review submission' });
  }
});

module.exports = router;
