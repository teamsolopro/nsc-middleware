(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data/auditions.json';
  var GRID_ID = 'nsc-auditions-grid';
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

  function renderCard(a) {
    var company = (a.linkedCompanyId && a.linkedCompanyId.name) || '';
    var city    = (a.linkedVenueId && a.linkedVenueId.city) || (a.linkedCompanyId && a.linkedCompanyId.city) || '';
    var state   = (a.linkedVenueId && a.linkedVenueId.state) || (a.linkedCompanyId && a.linkedCompanyId.state) || '';
    var location = [city, state].filter(Boolean).join(', ');
    var firstDate = (a.auditionDates && a.auditionDates[0]) ? formatDate(a.auditionDates[0].date) : '';
    var title = esc((a.show && a.show.title) || 'Untitled');

    return [
      '<div class="nsc-card">',
        '<span class="nsc-card-label">Audition</span>',
        '<h3 class="nsc-card-title">' + title + '</h3>',
        company  ? '<p class="nsc-card-company">' + esc(company) + '</p>' : '',
        location ? '<p class="nsc-card-meta">&#128205; ' + esc(location) + '</p>' : '',
        firstDate ? '<p class="nsc-card-meta">&#128197; Auditions from ' + esc(firstDate) + '</p>' : '',
        '<a class="nsc-card-link" href="/auditions#' + esc(a._id) + '">View Details &rarr;</a>',
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
          grid.innerHTML = '<p class="nsc-empty">No open auditions right now — check back soon.</p>';
          return;
        }
        grid.innerHTML = data.slice(0, MAX).map(renderCard).join('');
      })
      .catch(function () {
        grid.innerHTML = '<p class="nsc-empty">Unable to load auditions. Please try again later.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
