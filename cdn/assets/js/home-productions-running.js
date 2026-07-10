(function () {
  'use strict';

  var CDN        = 'https://cdn.neighborhoodstage.com/data/productions.json';
  var SECTION_ID = 'nsc-running-section';
  var GRID_ID    = 'nsc-running-grid';
  var MAX        = 6;

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function renderCard(p) {
    var company  = (p.linkedCompanyId && p.linkedCompanyId.name) || '';
    var city     = (p.linkedVenueId && p.linkedVenueId.city) || (p.linkedCompanyId && p.linkedCompanyId.city) || '';
    var state    = (p.linkedVenueId && p.linkedVenueId.state) || (p.linkedCompanyId && p.linkedCompanyId.state) || '';
    var location = [city, state].filter(Boolean).join(', ');
    var closes   = p.dates && p.dates.closes ? 'Closes ' + formatDate(p.dates.closes) : '';
    var showType = (p.show && p.show.type) ? p.show.type.charAt(0).toUpperCase() + p.show.type.slice(1) : 'Production';
    var rating   = (p.show && p.show.familyRating) ? ' &middot; ' + p.show.familyRating : '';
    var title    = esc((p.show && p.show.title) || 'Untitled');

    return [
      '<div class="nsc-card">',
        '<span class="nsc-card-label">' + esc(showType) + rating + '</span>',
        '<h3 class="nsc-card-title">' + title + '</h3>',
        company  ? '<p class="nsc-card-company">' + esc(company) + '</p>' : '',
        location ? '<p class="nsc-card-meta">&#128205; ' + esc(location) + '</p>' : '',
        closes   ? '<p class="nsc-card-meta">&#128197; ' + esc(closes) + '</p>' : '',
        '<a class="nsc-card-link" href="/shows/detail?id=' + esc(p._id) + '">View Details &rarr;</a>',
      '</div>',
    ].join('');
  }

  function init() {
    var section = document.getElementById(SECTION_ID);
    var grid    = document.getElementById(GRID_ID);
    if (!section || !grid) return;

    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!Array.isArray(data)) return;

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var running = data.filter(function (p) {
          var opens  = p.dates && p.dates.opens  ? new Date(p.dates.opens)  : null;
          var closes = p.dates && p.dates.closes ? new Date(p.dates.closes) : null;
          if (!opens || !closes) return false;
          opens.setHours(0, 0, 0, 0);
          closes.setHours(0, 0, 0, 0);
          return opens <= today && closes >= today;
        });

        if (running.length === 0) {
          section.style.display = 'none';
          return;
        }

        grid.innerHTML = running.slice(0, MAX).map(renderCard).join('');
      })
      .catch(function () {
        section.style.display = 'none';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
