(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data/productions.json';
  var GRID_ID      = 'nsc-productions-grid';
  var LOADING_ID   = 'nsc-loading';
  var EMPTY_ID     = 'nsc-empty';
  var COUNT_ID     = 'nsc-result-count';
  var SEARCH_ID    = 'nsc-search';
  var FILTER_TYPE_ID   = 'nsc-filter-type';
  var FILTER_RATING_ID = 'nsc-filter-rating';
  var FILTER_RADIUS_ID = 'nsc-filter-radius';
  var FILTER_DATE_FROM_ID = 'nsc-filter-date-from';
  var FILTER_DATE_TO_ID   = 'nsc-filter-date-to';
  var GEO_STATUS_ID = 'nsc-geo-status';

  var allProductions = [];
  var userLat = null;
  var userLng = null;

  // ─── Haversine distance (miles) ───────────────────────────
  function haversine(lat1, lng1, lat2, lng2) {
    var R = 3958.8;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── Helpers ──────────────────────────────────────────────
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

  function formatCurrency(val) {
    if (val == null || val === '') return '';
    return '$' + Number(val).toFixed(2).replace(/\.00$/, '');
  }

  function el(id) { return document.getElementById(id); }

  // ─── Card renderer ─────────────────────────────────────────
  function renderCard(p) {
    var company  = (p.linkedCompanyId && p.linkedCompanyId.name) || '';
    var venue    = (p.linkedVenueId && p.linkedVenueId.name) || '';
    var city     = (p.linkedVenueId && p.linkedVenueId.city) || (p.linkedCompanyId && p.linkedCompanyId.city) || '';
    var state    = (p.linkedVenueId && p.linkedVenueId.state) || (p.linkedCompanyId && p.linkedCompanyId.state) || '';
    var location = [city, state].filter(Boolean).join(', ');

    var opens  = p.dates && p.dates.opens  ? formatDate(p.dates.opens)  : '';
    var closes = p.dates && p.dates.closes ? formatDate(p.dates.closes) : '';
    var dateRange = (opens && closes) ? opens + ' &ndash; ' + closes : opens || '';

    var _types = (p.show && p.show.showType && p.show.showType.length) ? p.show.showType : (p.show && p.show.type ? [p.show.type] : []);
    var showType = _types.length ? _types.map(function(t){ return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g,' '); }).join(' / ') : 'Production';
    var rating     = (p.show && p.show.familyRating) ? ' &middot; ' + p.show.familyRating : '';
    var title      = esc((p.show && p.show.title) || 'Untitled');
    var author     = (p.show && p.show.author) ? ' by ' + esc(p.show.author) : '';
    var desc       = (p.show && p.show.description) ? esc(p.show.description).slice(0, 140) + (p.show.description.length > 140 ? '&hellip;' : '') : '';

    var ga = p.tickets && p.tickets.generalAdmission != null ? formatCurrency(p.tickets.generalAdmission) : '';
    var ticketLine = ga ? '<p class="nsc-card-meta">🎟 From ' + ga + '</p>' : '';
    var bookingUrl = (p.tickets && p.tickets.bookingUrl) ? p.tickets.bookingUrl : '';

    var distLine = '';
    if (p._distance != null) {
      distLine = '<p class="nsc-card-meta nsc-distance">' + p._distance.toFixed(1) + ' mi away</p>';
    }

    var poster = (p.show && p.show.posterImageUrl)
      ? '<img class="nsc-card-poster" src="' + esc(p.show.posterImageUrl) + '" alt="' + title + ' poster" loading="lazy">'
      : '';

    return [
      '<div class="nsc-card">',
        poster,
        '<span class="nsc-card-label">' + esc(showType) + rating + '</span>',
        '<h3 class="nsc-card-title">' + title + '<span class="nsc-card-author">' + author + '</span></h3>',
        company  ? '<p class="nsc-card-company">' + esc(company) + '</p>' : '',
        venue && venue !== company ? '<p class="nsc-card-meta">🏛 ' + esc(venue) + '</p>' : '',
        location ? '<p class="nsc-card-meta">📍 ' + esc(location) + '</p>' : '',
        dateRange ? '<p class="nsc-card-meta">🗓 ' + dateRange + '</p>' : '',
        distLine,
        ticketLine,
        desc ? '<p class="nsc-card-desc">' + desc + '</p>' : '',
        '<div class="nsc-card-actions">',
          bookingUrl
            ? '<a class="nsc-btn nsc-btn-primary" href="' + esc(bookingUrl) + '" target="_blank" rel="noopener">Get Tickets</a>'
            : '',
          '<a class="nsc-card-link" href="/shows/detail?id=' + esc(p._id) + '">Details &rarr;</a>',
        '</div>',
      '</div>',
    ].join('');
  }

  // ─── Filter & render ───────────────────────────────────────
  function applyFilters() {
    var search    = (el(SEARCH_ID)    && el(SEARCH_ID).value.trim().toLowerCase())    || '';
    var typeVal   = (el(FILTER_TYPE_ID)   && el(FILTER_TYPE_ID).value)   || '';
    var ratingVal = (el(FILTER_RATING_ID) && el(FILTER_RATING_ID).value) || '';
    var radiusMi  = parseFloat((el(FILTER_RADIUS_ID) && el(FILTER_RADIUS_ID).value) || '0');
    var dateFrom  = (el(FILTER_DATE_FROM_ID) && el(FILTER_DATE_FROM_ID).value) ? new Date(el(FILTER_DATE_FROM_ID).value) : null;
    var dateTo    = (el(FILTER_DATE_TO_ID)   && el(FILTER_DATE_TO_ID).value)   ? new Date(el(FILTER_DATE_TO_ID).value)   : null;

    var filtered = allProductions.filter(function (p) {
      // Search
      if (search) {
        var titleMatch   = ((p.show && p.show.title)  || '').toLowerCase().indexOf(search) !== -1;
        var companyMatch = ((p.linkedCompanyId && p.linkedCompanyId.name) || '').toLowerCase().indexOf(search) !== -1;
        var authorMatch  = ((p.show && p.show.author) || '').toLowerCase().indexOf(search) !== -1;
        if (!titleMatch && !companyMatch && !authorMatch) return false;
      }

      // Show type
      if (typeVal && (p.show && p.show.type) !== typeVal) return false;

      // Family rating
      if (ratingVal && (p.show && p.show.familyRating) !== ratingVal) return false;

      // Date range — show if run overlaps with selected range
      if (dateFrom && p.dates && p.dates.closes && new Date(p.dates.closes) < dateFrom) return false;
      if (dateTo   && p.dates && p.dates.opens  && new Date(p.dates.opens)  > dateTo)   return false;

      // Location radius
      if (radiusMi > 0 && userLat !== null) {
        var vLat = p.linkedVenueId && p.linkedVenueId.lat;
        var vLng = p.linkedVenueId && p.linkedVenueId.lng;
        if (vLat && vLng) {
          p._distance = haversine(userLat, userLng, vLat, vLng);
          if (p._distance > radiusMi) return false;
        } else {
          p._distance = null;
        }
      } else {
        p._distance = null;
      }

      return true;
    });

    // Sort: by opening date ascending, then by distance if radius active
    filtered.sort(function (a, b) {
      if (radiusMi > 0 && userLat !== null && a._distance != null && b._distance != null) {
        return a._distance - b._distance;
      }
      var aDate = a.dates && a.dates.opens ? new Date(a.dates.opens) : new Date('9999');
      var bDate = b.dates && b.dates.opens ? new Date(b.dates.opens) : new Date('9999');
      return aDate - bDate;
    });

    var grid  = el(GRID_ID);
    var empty = el(EMPTY_ID);
    var count = el(COUNT_ID);

    if (filtered.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      grid.innerHTML = filtered.map(renderCard).join('');
    }

    if (count) count.textContent = filtered.length + ' show' + (filtered.length !== 1 ? 's' : '');
  }

  // ─── Geolocation ──────────────────────────────────────────
  function initGeo() {
    var statusEl = el(GEO_STATUS_ID);
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'Geolocation not supported by your browser.';
      return;
    }
    if (statusEl) statusEl.textContent = 'Detecting your location…';
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        if (statusEl) statusEl.textContent = 'Location detected.';
        applyFilters();
      },
      function () {
        if (statusEl) statusEl.textContent = 'Location unavailable — distance filter disabled.';
      },
      { timeout: 8000 }
    );
  }

  // ─── Wire up filter controls ──────────────────────────────
  function bindControls() {
    var ids = [SEARCH_ID, FILTER_TYPE_ID, FILTER_RATING_ID, FILTER_RADIUS_ID, FILTER_DATE_FROM_ID, FILTER_DATE_TO_ID];
    ids.forEach(function (id) {
      var elem = el(id);
      if (elem) elem.addEventListener('input', applyFilters);
    });

    var clearBtn = el('nsc-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ids.forEach(function (id) {
          var e = el(id);
          if (e) e.value = '';
        });
        applyFilters();
      });
    }
  }

  // ─── Boot ─────────────────────────────────────────────────
  function init() {
    var loadingEl = el(LOADING_ID);
    var emptyEl   = el(EMPTY_ID);

    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (loadingEl) loadingEl.style.display = 'none';
        allProductions = Array.isArray(data) ? data : [];
        bindControls();
        applyFilters();
        initGeo();
      })
      .catch(function () {
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
          emptyEl.textContent = 'Unable to load shows. Please try again later.';
          emptyEl.style.display = 'block';
        }
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
