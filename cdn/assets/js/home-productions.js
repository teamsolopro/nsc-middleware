(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data/productions.json';
  var GRID_ID = 'nsc-productions-grid';
  var MAX = 3;

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCard(p) {
    var company = (p.linkedCompanyId && p.linkedCompanyId.name) || '';
    var city    = (p.linkedVenueId && p.linkedVenueId.city) || (p.linkedCompanyId && p.linkedCompanyId.city) || '';
    var state   = (p.linkedVenueId && p.linkedVenueId.state) || (p.linkedCompanyId && p.linkedCompanyId.state) || '';
    var location = [city, state].filter(Boolean).join(', ');

    var opens  = p.dates && p.dates.opens  ? formatDate(p.dates.opens)  : '';
    var closes = p.dates && p.dates.closes ? formatDate(p.dates.closes) : '';
    var dateRange = (opens && closes) ? opens + ' – ' + closes : opens || '';

    var showType = (p.show && p.show.type) ? p.show.type.charAt(0).toUpperCase() + p.show.type.slice(1) : 'Production';
    var rating   = (p.show && p.show.familyRating) ? ' · ' + p.show.familyRating : '';
    var title    = esc((p.show && p.show.title) || 'Untitled');
    var poster   = (p.show && p.show.posterImageUrl)
      ? '<img class="nsc-card-poster" src="' + esc(p.show.posterImageUrl) + '" alt="' + title + ' poster" loading="lazy">'
      : '';

    return [
      '<div class="nsc-card">',
        poster,
        '<span class="nsc-card-label">' + esc(showType) + esc(rating) + '</span>',
        '<h3 class="nsc-card-title">' + title + '</h3>',
        company   ? '<p class="nsc-card-company">' + esc(company) + '</p>' : '',
        location  ? '<p class="nsc-card-meta">&#128205; ' + esc(location) + '</p>' : '',
        dateRange ? '<p class="nsc-card-meta">&#128197; ' + esc(dateRange) + '</p>' : '',
        '<a class="nsc-card-link" href="/shows#' + esc(p._id) + '">View Details &rarr;</a>',
      '</div>',
    ].join('');
  }

  function init() {
    var grid = document.getElementById(GRID_ID);
    if (!grid) return;

    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data) || data.length === 0) {
          grid.innerHTML = '<p class="nsc-empty">No upcoming shows right now — check back soon.</p>';
          return;
        }
        grid.innerHTML = data.slice(0, MAX).map(renderCard).join('');
      })
      .catch(function () {
        grid.innerHTML = '<p class="nsc-empty">Unable to load shows. Please try again later.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
