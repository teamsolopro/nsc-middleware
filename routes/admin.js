const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { requireAuth } = require('../middleware/auth');
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Company = require('../models/Company');
const Venue = require('../models/Venue');
const ReviewRequest = require('../models/ReviewRequest');
const { geocodeAddress } = require('../lib/geocode');

const logoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.post('/upload-logo', requireAuth, logoUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(ext)) {
      return res.status(400).json({ error: 'Only JPG, PNG, WebP, and SVG files are allowed' });
    }
    const { CDN_ACCOUNT_ID, CDN_ACCESS_KEY_ID, CDN_SECRET_ACCESS_KEY, CDN_BUCKET_NAME } = process.env;
    if (!CDN_ACCOUNT_ID) return res.status(500).json({ error: 'CDN not configured' });
    const key = `media/logos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
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
    res.json({ url: `https://cdn.neighborhoodstage.com/${key}` });
  } catch (err) {
    console.error('[admin] /upload-logo error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Login
router.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const validUser = username === process.env.ADMIN_USERNAME;
  const hash = process.env.ADMIN_PASSWORD_HASH || '';
  const validPass = await bcrypt.compare(password, hash);
  if (validUser && validPass) {
    req.session.authenticated = true;
    return req.session.save(() => res.redirect('/admin'));
  }
  res.render('admin/login', { error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// Dashboard
router.get('/', requireAuth, async (req, res) => {
  const [pendingAuditions, pendingProductions] = await Promise.all([
    Audition.countDocuments({ status: 'pending' }),
    Production.countDocuments({ status: 'pending' }),
  ]);
  res.render('admin/dashboard', { pendingAuditions, pendingProductions });
});

// Pending queue
router.get('/pending', requireAuth, async (req, res) => {
  const [auditions, productions] = await Promise.all([
    Audition.find({ status: 'pending' }).populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name city').sort({ submittedAt: 1 }),
    Production.find({ status: 'pending' }).populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name city').sort({ submittedAt: 1 }),
  ]);
  res.render('admin/pending', { auditions, productions });
});

// Approve
router.post('/approve/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const Model = type === 'audition' ? Audition : Production;
  await Model.findByIdAndUpdate(id, { status: 'published' });
  res.redirect('/admin/pending');
});

// Reject
router.post('/reject/:type/:id', requireAuth, async (req, res) => {
  const { type, id } = req.params;
  const { note } = req.body;
  const Model = type === 'audition' ? Audition : Production;
  await Model.findByIdAndUpdate(id, { status: 'rejected', adminNotes: note });
  res.redirect('/admin/pending');
});

// Companies
router.get('/companies', requireAuth, async (req, res) => {
  const companies = await Company.find().sort({ name: 1 });
  res.render('admin/companies', { companies });
});

router.post('/companies', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const baseSlug = (d.slug || d.name || '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await Company.create({
      name:         d.name,
      slug:         baseSlug + '-' + Date.now(),
      city:         d.city         || undefined,
      state:        d.state        || undefined,
      region:       d.region       || undefined,
      website:      d.website      || undefined,
      logoUrl:      d.logoUrl      || undefined,
      bio:          d.bio          || undefined,
      contactName:  d.contactName  || undefined,
      contactEmail: d.contactEmail || undefined,
      contactPhone: d.contactPhone || undefined,
      verified:     d.verified === 'on',
    });
    res.redirect('/admin/companies');
  } catch (err) {
    console.error('[admin] POST /companies error:', err);
    res.status(500).send('Failed to add company: ' + err.message);
  }
});

router.post('/companies/:id', requireAuth, async (req, res) => {
  const d = req.body;
  await Company.findByIdAndUpdate(req.params.id, {
    name: d.name, slug: d.slug, city: d.city, state: d.state, region: d.region,
    website: d.website, logoUrl: d.logoUrl || undefined, bio: d.bio,
    contactName: d.contactName, contactEmail: d.contactEmail, contactPhone: d.contactPhone,
    'socialLinks.facebook':  d['socialLinks.facebook']  || undefined,
    'socialLinks.instagram': d['socialLinks.instagram'] || undefined,
    'socialLinks.twitter':   d['socialLinks.twitter']   || undefined,
    'socialLinks.tiktok':    d['socialLinks.tiktok']    || undefined,
    verified: d.verified === 'on',
  });
  res.redirect('/admin/companies');
});

router.post('/companies/:id/delete', requireAuth, async (req, res) => {
  await Company.findByIdAndDelete(req.params.id);
  res.redirect('/admin/companies');
});

// Productions
router.get('/productions', requireAuth, async (req, res) => {
  const [productions, companies, venues] = await Promise.all([
    Production.find().populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name').sort({ createdAt: -1 }),
    Company.find().sort({ name: 1 }),
    Venue.find().sort({ name: 1 }),
  ]);
  res.render('admin/productions', { productions, companies, venues, error: null });
});

router.post('/productions', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const production = new Production({
      linkedCompanyId: d.linkedCompanyId || undefined,
      linkedVenueId:   d.linkedVenueId   || undefined,
      show: {
        title:          d.title,
        author:         d.author,
        composer:       d.composer,
        description:    d.description,
        type:           d.showType,
        familyRating:   d.familyRating,
        posterImageUrl: d.posterImageUrl,
        runtime:        d.runtime,
        contentWarnings: d.contentWarnings,
      },
      dates: {
        opens:  d.opens  || undefined,
        closes: d.closes || undefined,
      },
      tickets: {
        generalAdmission: d.ticketGeneral   || undefined,
        senior:           d.ticketSenior    || undefined,
        student:          d.ticketStudent   || undefined,
        child:            d.ticketChild     || undefined,
        bookingUrl:       d.ticketUrl       || undefined,
        boxOfficePhone:   d.boxOfficePhone  || undefined,
        notes:            d.ticketNotes     || undefined,
      },
      contactName:      d.contactName,
      contactEmail:     d.contactEmail,
      contactPhone:     d.contactPhone,
      status:           d.status || 'pending',
    });
    await production.save();
    res.redirect('/admin/productions');
  } catch (err) {
    const [companies, venues] = await Promise.all([
      Company.find().sort({ name: 1 }),
      Venue.find().sort({ name: 1 }),
    ]);
    const productions = await Production.find().populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name').sort({ createdAt: -1 });
    res.render('admin/productions', { productions, companies, venues, error: err.message });
  }
});

router.post('/productions/:id', requireAuth, async (req, res) => {
  const d = req.body;
  await Production.findByIdAndUpdate(req.params.id, {
    linkedCompanyId: d.linkedCompanyId || undefined,
    linkedVenueId:   d.linkedVenueId   || undefined,
    'show.title':          d.title,
    'show.author':         d.author,
    'show.composer':       d.composer,
    'show.description':    d.description,
    'show.showType':       Array.isArray(d.showType) ? d.showType : (d.showType ? [d.showType] : []),
    'show.familyRating':   d.familyRating,
    'show.posterImageUrl': d.posterImageUrl || undefined,
    'show.runtime':        d.runtime,
    'show.contentWarnings': d.contentWarnings,
    'dates.opens':  d.opens  || undefined,
    'dates.closes': d.closes || undefined,
    'tickets.generalAdmission': d.ticketGeneral  || undefined,
    'tickets.adult':            d.ticketAdult    || undefined,
    'tickets.senior':           d.ticketSenior   || undefined,
    'tickets.student':          d.ticketStudent  || undefined,
    'tickets.child':            d.ticketChild    || undefined,
    'tickets.bookingUrl':       d.ticketUrl      || undefined,
    'tickets.boxOfficePhone':   d.boxOfficePhone || undefined,
    'tickets.notes':            d.ticketNotes    || undefined,
    showtimes:    d.showtimes,
    contactName:  d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    status:       d.status,
    adminNotes:   d.adminNotes,
  });
  res.redirect('/admin/productions');
});

router.post('/productions/:id/clone', requireAuth, async (req, res) => {
  const src = await Production.findById(req.params.id).lean();
  if (!src) return res.redirect('/admin/productions');
  const { _id, createdAt, updatedAt, __v, ...rest } = src;
  const clone = { ...rest, status: 'pending' };
  if (clone.show) clone.show = { ...clone.show, title: (clone.show.title || 'Untitled') + ' (copy)' };
  await Production.create(clone);
  res.redirect('/admin/productions');
});

router.post('/productions/:id/status', requireAuth, async (req, res) => {
  await Production.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.redirect('/admin/productions');
});

router.post('/productions/:id/delete', requireAuth, async (req, res) => {
  await Production.findByIdAndDelete(req.params.id);
  res.redirect('/admin/productions');
});

// Venues
router.get('/venues', requireAuth, async (req, res) => {
  const venues = await Venue.find().sort({ name: 1 });
  res.render('admin/venues', { venues });
});

router.post('/venues', requireAuth, async (req, res) => {
  const d = req.body;
  const coords = await geocodeAddress({ address: d.address, city: d.city, state: d.state, zip: d.zip });
  await Venue.create({ ...d, lat: coords ? coords.lat : undefined, lng: coords ? coords.lng : undefined });
  res.redirect('/admin/venues');
});

router.put('/venues/:id', requireAuth, async (req, res) => {
  const d = req.body;
  const coords = await geocodeAddress({ address: d.address, city: d.city, state: d.state, zip: d.zip });
  await Venue.findByIdAndUpdate(req.params.id, { ...d, lat: coords ? coords.lat : undefined, lng: coords ? coords.lng : undefined });
  res.redirect('/admin/venues');
});

// Geocode all venues that are missing coordinates
router.post('/venues/geocode-all', requireAuth, async (req, res) => {
  const venues = await Venue.find({ $or: [{ lat: null }, { lat: { $exists: false } }] });
  let updated = 0;
  for (const v of venues) {
    const coords = await geocodeAddress({ address: v.address, city: v.city, state: v.state, zip: v.zip });
    if (coords) {
      await Venue.findByIdAndUpdate(v._id, { lat: coords.lat, lng: coords.lng });
      updated++;
    }
    // Small delay to be polite to the Census API
    await new Promise(r => setTimeout(r, 300));
  }
  res.json({ total: venues.length, updated });
});

// Auditions
router.get('/auditions', requireAuth, async (req, res) => {
  const [auditions, companies, venues, productions] = await Promise.all([
    Audition.find().populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name').sort({ createdAt: -1 }),
    Company.find().sort({ name: 1 }),
    Venue.find().sort({ name: 1 }),
    Production.find({ status: 'published' }).sort({ 'show.title': 1 }),
  ]);
  res.render('admin/auditions', { auditions, companies, venues, productions, error: null });
});

router.post('/auditions', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const audition = new Audition({
      linkedCompanyId:   d.linkedCompanyId   || undefined,
      linkedVenueId:     d.linkedVenueId     || undefined,
      linkedProductionId: d.linkedProductionId || undefined,
      show: {
        title:       d.title,
        author:      d.author,
        composer:    d.composer,
        description: d.description,
        type:        d.showType,
        showDates: {
          opens:  d.showOpens  || undefined,
          closes: d.showCloses || undefined,
        },
        isUnion:   d.isUnion === 'true',
        unionType: d.unionType || undefined,
      },
      rehearsalStart: d.rehearsalStart || undefined,
      auditionDates: d.auditionDate
        ? (Array.isArray(d.auditionDate) ? d.auditionDate : [d.auditionDate]).map(function (date, i) {
            const times = Array.isArray(d.auditionStartTime) ? d.auditionStartTime : [d.auditionStartTime];
            const ends  = Array.isArray(d.auditionEndTime)   ? d.auditionEndTime   : [d.auditionEndTime];
            const fmts  = Array.isArray(d.auditionFormat)    ? d.auditionFormat    : [d.auditionFormat];
            return {
              date:      date || undefined,
              startTime: times[i] || undefined,
              endTime:   ends[i]  || undefined,
              format:    fmts[i]  || undefined,
            };
          }).filter(function (ad) { return ad.date; })
        : [],
      ageRanges:   Array.isArray(d.ageRanges)   ? d.ageRanges   : (d.ageRanges   ? [d.ageRanges]   : []),
      genderOpen:  d.genderOpen  === 'on',
      genderMale:  d.genderMale  === 'on',
      genderFemale: d.genderFemale === 'on',
      requirements: {
        preparedSong:    d.preparedSong   === 'on',
        songLength:      d.songLength     || undefined,
        coldReading:     d.coldReading    === 'on',
        headshot:        d.headshot       === 'on',
        resume:          d.resume         === 'on',
        callbacks:       d.callbacks      || undefined,
        conflictDates:   d.conflictDates  || undefined,
        additionalNotes: d.additionalNotes || undefined,
      },
      contactName:      d.contactName,
      contactEmail:     d.contactEmail,
      contactPhone:     d.contactPhone,
      status:           d.status || 'pending',
    });
    await audition.save();
    res.redirect('/admin/auditions');
  } catch (err) {
    const [auditions, companies, venues, productions] = await Promise.all([
      Audition.find().populate('linkedCompanyId', 'name').populate('linkedVenueId', 'name').sort({ createdAt: -1 }),
      Company.find().sort({ name: 1 }),
      Venue.find().sort({ name: 1 }),
      Production.find({ status: 'published' }).sort({ 'show.title': 1 }),
    ]);
    res.render('admin/auditions', { auditions, companies, venues, productions, error: err.message });
  }
});

router.post('/auditions/:id', requireAuth, async (req, res) => {
  const d = req.body;
  await Audition.findByIdAndUpdate(req.params.id, {
    linkedCompanyId:    d.linkedCompanyId    || undefined,
    linkedVenueId:      d.linkedVenueId      || undefined,
    linkedProductionId: d.linkedProductionId || undefined,
    'show.title':       d.title,
    'show.author':      d.author,
    'show.composer':    d.composer,
    'show.description': d.description,
    'show.showType':    Array.isArray(d.showType) ? d.showType : (d.showType ? [d.showType] : []),
    'show.unionType':   d.unionType          || undefined,
    'show.showDates.opens':  d.showOpens  || undefined,
    'show.showDates.closes': d.showCloses || undefined,
    rehearsalStart: d.rehearsalStart || undefined,
    auditionDates: d.auditionDate
      ? (Array.isArray(d.auditionDate) ? d.auditionDate : [d.auditionDate]).map(function(date, i) {
          const times = Array.isArray(d.auditionStartTime) ? d.auditionStartTime : [d.auditionStartTime];
          const ends  = Array.isArray(d.auditionEndTime)   ? d.auditionEndTime   : [d.auditionEndTime];
          const fmts  = Array.isArray(d.auditionFormat)    ? d.auditionFormat    : [d.auditionFormat];
          return { date: date || undefined, startTime: times[i] || undefined, endTime: ends[i] || undefined, format: fmts[i] || undefined };
        }).filter(function(ad) { return ad.date; })
      : [],
    ageRanges:    Array.isArray(d.ageRanges)   ? d.ageRanges   : (d.ageRanges   ? [d.ageRanges]   : []),
    genderOpen:   d.genderOpen   === 'on',
    genderMale:   d.genderMale   === 'on',
    genderFemale: d.genderFemale === 'on',
    'requirements.preparedSong':    d.preparedSong   === 'on',
    'requirements.songLength':      d.songLength     || undefined,
    'requirements.coldReading':     d.coldReading    === 'on',
    'requirements.headshot':        d.headshot       === 'on',
    'requirements.resume':          d.resume         === 'on',
    'requirements.callbacks':       d.callbacks      || undefined,
    'requirements.conflictDates':   d.conflictDates  || undefined,
    'requirements.additionalNotes': d.additionalNotes || undefined,
    contactName:  d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone,
    adminNotes:   d.adminNotes,
    status:       d.status,
  });
  res.redirect('/admin/auditions');
});

router.post('/auditions/:id/status', requireAuth, async (req, res) => {
  await Audition.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.redirect('/admin/auditions');
});

router.post('/auditions/:id/delete', requireAuth, async (req, res) => {
  await Audition.findByIdAndDelete(req.params.id);
  res.redirect('/admin/auditions');
});

// Review Requests
router.get('/review-requests', requireAuth, async (req, res) => {
  const requests = await ReviewRequest.find()
    .populate('linkedCompanyId', 'name')
    .populate('linkedVenueId', 'name city')
    .sort({ submittedAt: -1 });
  res.render('admin/review-requests', { requests });
});

router.post('/review-requests/:id', requireAuth, async (req, res) => {
  const d = req.body;
  await ReviewRequest.findByIdAndUpdate(req.params.id, {
    status:       d.status,
    reviewerName: d.reviewerName || undefined,
    adminNotes:   d.adminNotes   || undefined,
    'show.title':     d.title,
    'show.author':    d.author    || undefined,
    'show.showtimes': d.showtimes || undefined,
    'show.runDates.opens':  d.runOpens  ? new Date(d.runOpens)  : undefined,
    'show.runDates.closes': d.runCloses ? new Date(d.runCloses) : undefined,
    compTickets:     d.compTickets === 'on',
    compTicketCount: d.compTicketCount ? parseInt(d.compTicketCount, 10) : undefined,
    contactName:  d.contactName,
    contactEmail: d.contactEmail,
    contactPhone: d.contactPhone || undefined,
  });
  res.redirect('/admin/review-requests');
});

router.post('/review-requests/:id/delete', requireAuth, async (req, res) => {
  await ReviewRequest.findByIdAndDelete(req.params.id);
  res.redirect('/admin/review-requests');
});

module.exports = router;
