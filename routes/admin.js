const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { requireAuth } = require('../middleware/auth');
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Company = require('../models/Company');
const Venue = require('../models/Venue');

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
  await Company.create(req.body);
  res.redirect('/admin/companies');
});

router.post('/companies/:id', requireAuth, async (req, res) => {
  const { name, slug, city, state, region, website, contactName, contactEmail, contactPhone, bio, verified } = req.body;
  await Company.findByIdAndUpdate(req.params.id, {
    name, slug, city, state, region, website, contactName, contactEmail, contactPhone, bio,
    verified: verified === 'on',
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
  await Venue.create(req.body);
  res.redirect('/admin/venues');
});

router.put('/venues/:id', requireAuth, async (req, res) => {
  await Venue.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin/venues');
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

router.post('/auditions/:id/status', requireAuth, async (req, res) => {
  await Audition.findByIdAndUpdate(req.params.id, { status: req.body.status });
  res.redirect('/admin/auditions');
});

router.post('/auditions/:id/delete', requireAuth, async (req, res) => {
  await Audition.findByIdAndDelete(req.params.id);
  res.redirect('/admin/auditions');
});

module.exports = router;
