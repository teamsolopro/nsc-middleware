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
  console.log('[login] user match:', validUser);
  console.log('[login] hash length:', hash.length);
  console.log('[login] hash prefix:', hash.slice(0, 7));
  const validPass = await bcrypt.compare(password, hash);
  console.log('[login] pass match:', validPass);
  if (validUser && validPass) {
    req.session.authenticated = true;
    return res.redirect('/admin');
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
    Audition.find({ status: 'pending' }).sort({ submittedAt: 1 }),
    Production.find({ status: 'pending' }).sort({ submittedAt: 1 }),
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

router.put('/companies/:id', requireAuth, async (req, res) => {
  await Company.findByIdAndUpdate(req.params.id, req.body);
  res.redirect('/admin/companies');
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

module.exports = router;
