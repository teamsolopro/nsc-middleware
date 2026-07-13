const express = require('express');
const router = express.Router();
const cors = require('cors');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { validateWebhook } = require('../middleware/validateWebhook');
const { geocodeAddress } = require('../lib/geocode');

// CORS — handle preflight and responses for all webhook routes
router.use(cors());
router.options('*', cors());
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Review = require('../models/Review');
const Company = require('../models/Company');
const Venue = require('../models/Venue');
const stripPrice = v => v ? parseFloat(v.replace(/[^0-9.]/g, '')) || v : undefined;
const toId = v => (v && /^[a-f\d]{24}$/i.test(v)) ? v : undefined;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Poster image upload ───────────────────────────────────
router.post('/upload-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const { CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY, CDN_BUCKET_NAME } = process.env;
    if (!CDN_ACCOUNT_ID || !CDN_ACCESS_KEY_ID || !CDN_SECRET_ACCESS_KEY || !CDN_BUCKET_NAME) {
      return res.status(500).json({ error: 'CDN not configured' });
    }

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return res.status(400).json({ error: 'Only JPG, PNG, and WebP files are allowed' });
    }

    const key = `media/posters/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${CDN_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: CDN_ACCESS_KEY_ID, secretAccessKey: CDN_SECRET_ACCESS_KEY },
    });

    await client.send(new PutObjectCommand({
      Bucket: CDN_BUCKET_NAME,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = `https://cdn.neighborhoodstage.com/${key}`;
    console.log(`[webhook] Poster uploaded: ${url}`);
    res.status(200).json({ url });
  } catch (err) {
    console.error('[webhook] /upload-image error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── Show submission ───────────────────────────────────────
router.post('/submit-show', async (req, res) => {
  try {
    const d = req.body;
    const production = new Production({
      linkedCompanyId: toId(d.linkedCompanyId),
      linkedVenueId:   toId(d.linkedVenueId),
      show: {
        title:           d.title,
        author:          d.author,
        composer:        d.composer         || undefined,
        description:     d.marketingDescription,
        showType:        Array.isArray(d.showType) ? d.showType : (d.showType ? [d.showType] : []),
        familyRating:    d.familyRating     || undefined,
        posterImageUrl:  d.posterImageUrl   || undefined,
        runtime:         d.runtime          || undefined,
        contentWarnings: d.contentWarnings  || undefined,
      },
      dates: {
        opens:  d.runDates && d.runDates.start ? new Date(d.runDates.start) : undefined,
        closes: d.runDates && d.runDates.end   ? new Date(d.runDates.end)   : undefined,
      },
      tickets: {
        generalAdmission: d.ticketPrices && d.ticketPrices.general ? stripPrice(d.ticketPrices.general) : undefined,
        adult:            d.ticketPrices && d.ticketPrices.adult   ? stripPrice(d.ticketPrices.adult)   : undefined,
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
router.post('/submit-company', async (req, res) => {
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
router.post('/submit-venue', async (req, res) => {
  try {
    const d = req.body;
    const coords = await geocodeAddress({ address: d.address, city: d.city, state: d.state, zip: d.zip });
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
      lat:             coords ? coords.lat : undefined,
      lng:             coords ? coords.lng : undefined,
    });
    await venue.save();
    console.log(`[webhook] New venue submission: ${venue._id} — ${d.name}${coords ? ` (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` : ' (no geocode)'}`);
    res.status(200).json({ received: true, id: venue._id, name: venue.name });
  } catch (err) {
    console.error('[webhook] /submit-venue error:', err);
    res.status(500).json({ error: 'Failed to save venue submission' });
  }
});

// ─── Audition submission ───────────────────────────────────
router.post('/submit-audition', async (req, res) => {
  try {
    const d = req.body;
    const audition = new Audition({
      linkedCompanyId: toId(d.linkedCompanyId),
      linkedVenueId:   toId(d.linkedVenueId),
      show: {
        title:    d.title,
        author:   d.author    || undefined,
        composer: d.composer  || undefined,
        showType: Array.isArray(d.showType) ? d.showType : (d.showType ? [d.showType] : []),
        showDates: {
          opens:  d.productionOpens  ? new Date(d.productionOpens)  : undefined,
          closes: d.productionCloses ? new Date(d.productionCloses) : undefined,
        },
      },
      rehearsalStart: d.rehearsalStart ? new Date(d.rehearsalStart) : undefined,
      auditionDates: Array.isArray(d.auditionDates) ? d.auditionDates.map(function(ad) {
        return {
          date:      ad.date      ? new Date(ad.date) : undefined,
          startTime: ad.startTime || undefined,
          endTime:   ad.endTime   || undefined,
          format:    ad.format    || undefined,
        };
      }) : [],
      ageRanges:   Array.isArray(d.ageRanges) ? d.ageRanges : (d.ageRanges ? [d.ageRanges] : []),
      genderOpen:   d.genderOpen   === true || d.genderOpen   === 'true',
      genderMale:   d.genderMale   === true || d.genderMale   === 'true',
      genderFemale: d.genderFemale === true || d.genderFemale === 'true',
      requirements: {
        preparedSong:    d.preparedSong   === true || d.preparedSong   === 'true',
        songLength:      d.songLength     || undefined,
        coldReading:     d.coldReading    === true || d.coldReading    === 'true',
        headshot:        d.headshot       === true || d.headshot       === 'true',
        resume:          d.resume         === true || d.resume         === 'true',
        callbacks:       d.callbacks      || undefined,
        conflictDates:   d.conflictDates  || undefined,
        additionalNotes: d.additionalNotes || undefined,
      },
      contactName:      d.contactName,
      contactEmail:     d.contactEmail,
      contactPhone:     d.contactPhone    || undefined,
      submittedByEmail: d.contactEmail,
      status: 'pending',
    });
    await audition.save();
    console.log(`[webhook] New audition submission: ${audition._id} — ${d.title}`);
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
