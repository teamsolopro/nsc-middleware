const express = require('express');
const router = express.Router();
const Audition = require('../models/Audition');
const Production = require('../models/Production');
const Company = require('../models/Company');

function buildFilter(query, baseFilter = {}) {
  const filter = { ...baseFilter };
  if (query.region) filter['linkedCompanyId.region'] = query.region; // populated query — see note below
  if (query.type) filter['show.type'] = query.type;
  if (query.search) {
    filter['show.title'] = { $regex: query.search, $options: 'i' };
  }
  return filter;
}

// Auditions
router.get('/auditions', async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      status: 'published',
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
    };
    if (req.query.type) filter['show.type'] = req.query.type;
    if (req.query.search) filter['show.title'] = { $regex: req.query.search, $options: 'i' };

    let query = Audition.find(filter)
      .populate('linkedCompanyId', 'name slug city state region')
      .populate('linkedVenueId', 'name city state')
      .sort({ 'auditionDates.0.date': 1 });

    if (req.query.region) {
      // Filter by company region after populate — use aggregation for production use
      const results = await query;
      return res.json(results.filter((a) => a.linkedCompanyId?.region === req.query.region));
    }

    res.json(await query);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/auditions/:id', async (req, res) => {
  try {
    const audition = await Audition.findById(req.params.id)
      .populate('linkedCompanyId')
      .populate('linkedVenueId')
      .populate('linkedProductionId', 'show dates');
    if (!audition || audition.status !== 'published') return res.status(404).json({ error: 'Not found' });
    res.json(audition);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Productions
router.get('/productions', async (req, res) => {
  try {
    const now = new Date();
    const filter = {
      status: 'published',
      $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }],
    };
    if (req.query.type) filter['show.type'] = req.query.type;
    if (req.query.search) filter['show.title'] = { $regex: req.query.search, $options: 'i' };

    let query = Production.find(filter)
      .populate('linkedCompanyId', 'name slug city state region')
      .populate('linkedVenueId', 'name city state')
      .sort({ 'dates.opens': 1 });

    if (req.query.region) {
      const results = await query;
      return res.json(results.filter((p) => p.linkedCompanyId?.region === req.query.region));
    }

    res.json(await query);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/productions/:id', async (req, res) => {
  try {
    const production = await Production.findById(req.params.id)
      .populate('linkedCompanyId')
      .populate('linkedVenueId')
      .populate('linkedAuditionId', 'auditionDates status');
    if (!production || production.status !== 'published') return res.status(404).json({ error: 'Not found' });
    res.json(production);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Company profile (Phase 2)
router.get('/companies/:slug', async (req, res) => {
  try {
    const company = await Company.findOne({ slug: req.params.slug }).populate('homeVenueIds');
    if (!company) return res.status(404).json({ error: 'Not found' });

    const now = new Date();
    const [auditions, productions] = await Promise.all([
      Audition.find({ linkedCompanyId: company._id, status: 'published', $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] }),
      Production.find({ linkedCompanyId: company._id, status: 'published', $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] }),
    ]);

    res.json({ company, auditions, productions });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
