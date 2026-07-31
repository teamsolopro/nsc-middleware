const Production = require('../models/Production');
const PastProduction = require('../models/PastProduction');
const Audition = require('../models/Audition');
const { runExport } = require('./exportJson');

async function runArchive() {
  const now = new Date();

  // ── Archive expired productions ──────────────────────────────────────────
  // A production is expired when expiresAt has passed (set to closes + 1 day
  // when the record is published). Also catch any published records whose
  // closing date has passed but expiresAt was never set.
  const expiredProductions = await Production.find({
    status: 'published',
    $or: [
      { expiresAt: { $lte: now } },
      { expiresAt: null, 'dates.closes': { $lte: now } },
    ],
  }).lean();

  let archivedCount = 0;
  for (const doc of expiredProductions) {
    const { _id, ...rest } = doc;
    await PastProduction.create({ _id, ...rest, archivedAt: now });
    await Production.deleteOne({ _id });
    archivedCount++;
  }

  // ── Delete expired auditions ─────────────────────────────────────────────
  // Auditions are transient — no history needed — so just delete them.
  const expiredAuditionResult = await Audition.deleteMany({
    status: 'published',
    $or: [
      { expiresAt: { $lte: now } },
      {
        expiresAt: null,
        'auditionDates.0.date': { $lte: now },
      },
    ],
  });

  console.log(
    `[archiveOld] Archived ${archivedCount} production(s) → past_productions. ` +
    `Deleted ${expiredAuditionResult.deletedCount} expired audition(s).`
  );

  // Re-export CDN JSON so productions.json and auditions.json reflect the changes.
  await runExport();
  console.log('[archiveOld] CDN export complete.');

  return {
    archivedProductions: archivedCount,
    deletedAuditions: expiredAuditionResult.deletedCount,
  };
}

module.exports = { runArchive };
