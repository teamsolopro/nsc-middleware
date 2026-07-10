(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data/productions.json';
  var CONTAINER_ID = 'nsc-show-detail';

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatCurrency(val) {
    if (val == null || val === '') return '';
    return '$' + Number(val).toFixed(2).replace(/\.00$/, '');
  }

  function getQueryParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function renderDetail(p) {
    var company  = (p.linkedCompanyId && p.linkedCompanyId.name) || '';
    var companyWebsite = (p.linkedCompanyId && p.linkedCompanyId.website) || '';
    var venue    = (p.linkedVenueId && p.linkedVenueId.name) || '';
    var address  = (p.linkedVenueId && p.linkedVenueId.address) || '';
    var city     = (p.linkedVenueId && p.linkedVenueId.city) || '';
    var state    = (p.linkedVenueId && p.linkedVenueId.state) || '';
    var mapUrl   = (p.linkedVenueId && p.linkedVenueId.mapUrl) || '';
    var location = [address, city, state].filter(Boolean).join(', ');

    var title    = esc((p.show && p.show.title) || 'Untitled');
    var author   = (p.show && p.show.author)   ? 'by ' + esc(p.show.author)   : '';
    var composer = (p.show && p.show.composer) ? 'Music by ' + esc(p.show.composer) : '';
    var showType = (p.show && p.show.type) ? p.show.type.charAt(0).toUpperCase() + p.show.type.slice(1) : '';
    var rating   = (p.show && p.show.familyRating) || '';
    var runtime  = (p.show && p.show.runtime) || '';
    var warnings = (p.show && p.show.contentWarnings) || '';
    var desc     = (p.show && p.show.description) || '';
    var poster   = (p.show && p.show.posterImageUrl) || '';

    var opens    = p.dates && p.dates.opens  ? formatDateShort(p.dates.opens)  : '';
    var closes   = p.dates && p.dates.closes ? formatDateShort(p.dates.closes) : '';
    var dateRange = (opens && closes) ? opens + ' &ndash; ' + closes : opens || '';

    // Tickets
    var ticketRows = [];
    if (p.tickets) {
      if (p.tickets.generalAdmission != null) ticketRows.push(['General Admission', formatCurrency(p.tickets.generalAdmission)]);
      if (p.tickets.senior != null)           ticketRows.push(['Senior', formatCurrency(p.tickets.senior)]);
      if (p.tickets.student != null)          ticketRows.push(['Student', formatCurrency(p.tickets.student)]);
      if (p.tickets.child != null)            ticketRows.push(['Child', formatCurrency(p.tickets.child)]);
    }

    var ticketSection = '';
    if (ticketRows.length > 0 || (p.tickets && p.tickets.bookingUrl)) {
      ticketSection = [
        '<div class="nsc-detail-section">',
          '<h2 class="nsc-detail-subheading">Tickets</h2>',
          ticketRows.length > 0
            ? '<table class="nsc-ticket-table">' +
              ticketRows.map(function (r) {
                return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>';
              }).join('') +
              '</table>'
            : '',
          p.tickets && p.tickets.notes ? '<p class="nsc-detail-meta">' + esc(p.tickets.notes) + '</p>' : '',
          p.tickets && p.tickets.boxOfficePhone ? '<p class="nsc-detail-meta">Box Office: ' + esc(p.tickets.boxOfficePhone) + '</p>' : '',
          p.tickets && p.tickets.bookingUrl
            ? '<a class="nsc-btn nsc-btn-primary nsc-btn-lg" href="' + esc(p.tickets.bookingUrl) + '" target="_blank" rel="noopener">Get Tickets</a>'
            : '',
        '</div>',
      ].join('');
    }

    // Cast
    var castSection = '';
    if (p.cast && p.cast.length > 0) {
      castSection = [
        '<div class="nsc-detail-section">',
          '<h2 class="nsc-detail-subheading">Cast</h2>',
          '<table class="nsc-cast-table">',
            p.cast.map(function (c) {
              return '<tr><td class="nsc-cast-role">' + esc(c.role) + '</td><td>' + esc(c.actor) + '</td></tr>';
            }).join(''),
          '</table>',
        '</div>',
      ].join('');
    }

    // Venue
    var venueSection = '';
    if (venue || location) {
      venueSection = [
        '<div class="nsc-detail-section">',
          '<h2 class="nsc-detail-subheading">Venue</h2>',
          venue    ? '<p class="nsc-detail-venue-name">' + esc(venue) + '</p>' : '',
          location ? '<p class="nsc-detail-meta">' + esc(location) + '</p>' : '',
          mapUrl   ? '<a class="nsc-detail-link" href="' + esc(mapUrl) + '" target="_blank" rel="noopener">View on Map &rarr;</a>' : '',
        '</div>',
      ].join('');
    }

    // Company
    var companySection = '';
    if (company) {
      companySection = [
        '<div class="nsc-detail-section">',
          '<h2 class="nsc-detail-subheading">Presented By</h2>',
          '<p class="nsc-detail-company">' + esc(company) + '</p>',
          companyWebsite ? '<a class="nsc-detail-link" href="' + esc(companyWebsite) + '" target="_blank" rel="noopener">Visit Website &rarr;</a>' : '',
        '</div>',
      ].join('');
    }

    return [
      '<div class="nsc-detail-wrap">',

        // Left column
        '<div class="nsc-detail-main">',
          poster ? '<img class="nsc-detail-poster" src="' + esc(poster) + '" alt="' + title + ' poster">' : '',

          '<div class="nsc-detail-header">',
            '<span class="nsc-card-label">' + esc(showType) + (rating ? ' &middot; ' + rating : '') + (runtime ? ' &middot; ' + esc(runtime) : '') + '</span>',
            '<h1 class="nsc-detail-title">' + title + '</h1>',
            author   ? '<p class="nsc-detail-byline">' + author + '</p>' : '',
            composer ? '<p class="nsc-detail-byline">' + composer + '</p>' : '',
            dateRange ? '<p class="nsc-detail-dates">🗓 ' + dateRange + '</p>' : '',
          '</div>',

          desc ? '<div class="nsc-detail-section"><p class="nsc-detail-desc">' + esc(desc) + '</p></div>' : '',
          warnings ? '<div class="nsc-detail-section"><p class="nsc-detail-warning">⚠️ Content Advisory: ' + esc(warnings) + '</p></div>' : '',
          ticketSection,
          castSection,
        '</div>',

        // Right sidebar
        '<aside class="nsc-detail-sidebar">',
          venueSection,
          companySection,
          '<div class="nsc-detail-section">',
            '<a class="nsc-detail-link" href="/shows">&larr; Back to All Shows</a>',
          '</div>',
        '</aside>',

      '</div>',
    ].join('');
  }

  function init() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    var id = getQueryParam('id');
    if (!id) {
      container.innerHTML = '<p class="nsc-empty">No show specified.</p>';
      return;
    }

    container.innerHTML = '<p style="font-family:\'Lato\',sans-serif;color:#999">Loading…</p>';

    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var production = null;
        for (var i = 0; i < data.length; i++) {
          if (data[i]._id === id) { production = data[i]; break; }
        }
        if (!production) {
          container.innerHTML = '<p class="nsc-empty">Show not found. It may have been removed or the link is incorrect.</p>';
          return;
        }
        // Set page title
        if (production.show && production.show.title) {
          document.title = production.show.title + ' — Neighborhood Stage Carolinas';
        }
        container.innerHTML = renderDetail(production);
      })
      .catch(function () {
        container.innerHTML = '<p class="nsc-empty">Unable to load show details. Please try again later.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
