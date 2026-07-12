(function () {
  'use strict';

  var CDN        = 'https://cdn.neighborhoodstage.com/data/auditions.json';
  var GRID_ID    = 'nsc-auditions-grid';
  var LOADING_ID = 'nsc-loading';
  var EMPTY_ID   = 'nsc-empty';
  var COUNT_ID   = 'nsc-result-count';
  var GEO_STATUS_ID = 'nsc-geo-status';

  var allAuditions = [];
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

  function el(id) { return document.getElementById(id); }

  // ─── Card renderer ─────────────────────────────────────────
  function renderCard(a) {
    var company  = (a.linkedCompanyId && a.linkedCompanyId.name) || '';
    var city     = (a.linkedVenueId && a.linkedVenueId.city) || (a.linkedCompanyId && a.linkedCompanyId.city) || '';
    var state    = (a.linkedVenueId && a.linkedVenueId.state) || (a.linkedCompanyId && a.linkedCompanyId.state) || '';
    var location = [city, state].filter(Boolean).join(', ');

    var firstDate = (a.auditionDates && a.auditionDates[0]) ? formatDate(a.auditionDates[0].date) : '';
    var showOpens = a.show && a.show.showDates && a.show.showDates.opens ? formatDate(a.show.showDates.opens) : '';

    var showType = (a.show && a.show.type) ? a.show.type.charAt(0).toUpperCase() + a.show.type.slice(1) : 'Audition';
    var title    = esc((a.show && a.show.title) || 'Untitled');
    var author   = (a.show && a.show.author) ? ' by ' + esc(a.show.author) : '';
    var union    = (a.show && a.show.unionType) ? esc(a.show.unionType) : '';

    // Age ranges
    var ages = (a.ageRanges && a.ageRanges.length > 0)
      ? a.ageRanges.map(function (r) { return r.replace('_', ' '); }).join(', ')
      : '';

    // Gender
    var genders = [];
    if (a.genderOpen)   genders.push('Open');
    if (a.genderMale)   genders.push('Male roles');
    if (a.genderFemale) genders.push('Female roles');
    var genderLine = genders.join(', ');

    var distLine = '';
    if (a._distance != null) {
      distLine = '<p class="nsc-card-meta nsc-distance">' + a._distance.toFixed(1) + ' mi away</p>';
    }

    return [
      '<div class="nsc-card">',
        '<span class="nsc-card-label">' + esc(showType) + (union ? ' &middot; ' + union : '') + '</span>',
        '<h3 class="nsc-card-title">' + title + '<span class="nsc-card-author">' + author + '</span></h3>',
        company   ? '<p class="nsc-card-company">' + esc(company) + '</p>' : '',
        location  ? '<p class="nsc-card-meta">&#128205; ' + esc(location) + '</p>' : '',
        firstDate ? '<p class="nsc-card-meta">&#127908; Auditions from ' + esc(firstDate) + '</p>' : '',
        showOpens ? '<p class="nsc-card-meta">&#127917; Opens ' + esc(showOpens) + '</p>' : '',
        ages      ? '<p class="nsc-card-meta">&#128101; ' + esc(ages) + '</p>' : '',
        genderLine ? '<p class="nsc-card-meta">&#9881; ' + esc(genderLine) + '</p>' : '',
        distLine,
        '<a class="nsc-card-link" href="/auditions/detail?id=' + esc(a._id) + '">View Details &rarr;</a>',
      '</div>',
    ].join('');
  }

  // ─── Filter & render ───────────────────────────────────────
  function applyFilters() {
    var search      = (el('nsc-search') && el('nsc-search').value.trim().toLowerCase()) || '';
    var typeVal     = (el('nsc-filter-type') && el('nsc-filter-type').value) || '';
    var ageVal      = (el('nsc-filter-age') && el('nsc-filter-age').value) || '';
    var genderVal   = (el('nsc-filter-gender') && el('nsc-filter-gender').value) || '';
    var radiusMi    = parseFloat((el('nsc-filter-radius') && el('nsc-filter-radius').value) || '0');
    var dateFrom    = (el('nsc-filter-date-from') && el('nsc-filter-date-from').value) ? new Date(el('nsc-filter-date-from').value) : null;
    var dateTo      = (el('nsc-filter-date-to') && el('nsc-filter-date-to').value)     ? new Date(el('nsc-filter-date-to').value)   : null;

    var filtered = allAuditions.filter(function (a) {
      // Search
      if (search) {
        var titleMatch   = ((a.show && a.show.title)  || '').toLowerCase().indexOf(search) !== -1;
        var companyMatch = ((a.linkedCompanyId && a.linkedCompanyId.name) || '').toLowerCase().indexOf(search) !== -1;
        var authorMatch  = ((a.show && a.show.author) || '').toLowerCase().indexOf(search) !== -1;
        if (!titleMatch && !companyMatch && !authorMatch) return false;
      }

      // Show type
      if (typeVal && (a.show && a.show.type) !== typeVal) return false;

      // Age range
      if (ageVal && !(a.ageRanges && a.ageRanges.indexOf(ageVal) !== -1)) return false;

      // Gender
      if (genderVal === 'male'   && !a.genderMale)   return false;
      if (genderVal === 'female' && !a.genderFemale) return false;
      if (genderVal === 'open'   && !a.genderOpen)   return false;

      // Audition date range — show if any audition date falls within range
      if (dateFrom || dateTo) {
        var hasMatch = a.auditionDates && a.auditionDates.some(function (d) {
          if (!d.date) return false;
          var dt = new Date(d.date);
          if (dateFrom && dt < dateFrom) return false;
          if (dateTo   && dt > dateTo)   return false;
          return true;
        });
        if (!hasMatch) return false;
      }

      // Location radius
      if (radiusMi > 0 && userLat !== null) {
        var vLat = a.linkedVenueId && a.linkedVenueId.lat;
        var vLng = a.linkedVenueId && a.linkedVenueId.lng;
        if (vLat && vLng) {
          a._distance = haversine(userLat, userLng, vLat, vLng);
          if (a._distance > radiusMi) return false;
        } else {
          a._distance = null;
        }
      } else {
        a._distance = null;
      }

      return true;
    });

    // Sort by first audition date ascending
    filtered.sort(function (a, b) {
      if (radiusMi > 0 && userLat !== null && a._distance != null && b._distance != null) {
        return a._distance - b._distance;
      }
      var aDate = (a.auditionDates && a.auditionDates[0] && a.auditionDates[0].date) ? new Date(a.auditionDates[0].date) : new Date('9999');
      var bDate = (b.auditionDates && b.auditionDates[0] && b.auditionDates[0].date) ? new Date(b.auditionDates[0].date) : new Date('9999');
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

    if (count) count.textContent = filtered.length + ' audition' + (filtered.length !== 1 ? 's' : '');
  }

  // ─── Geolocation ──────────────────────────────────────────
  function initGeo() {
    var statusEl = el(GEO_STATUS_ID);
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'Geolocation not supported.';
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

  // ─── Wire up controls ──────────────────────────────────────
  function bindControls() {
    var ids = ['nsc-search','nsc-filter-type','nsc-filter-age','nsc-filter-gender','nsc-filter-radius','nsc-filter-date-from','nsc-filter-date-to'];
    ids.forEach(function (id) {
      var e = el(id);
      if (e) e.addEventListener('input', applyFilters);
    });
    var clearBtn = el('nsc-clear-filters');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ids.forEach(function (id) { var e = el(id); if (e) e.value = ''; });
        applyFilters();
      });
    }
  }

  // ─── Boot ─────────────────────────────────────────────────
  function init() {
    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var loadingEl = el(LOADING_ID);
        if (loadingEl) loadingEl.style.display = 'none';
        allAuditions = Array.isArray(data) ? data : [];
        bindControls();
        applyFilters();
        initGeo();
      })
      .catch(function () {
        var loadingEl = el(LOADING_ID);
        var emptyEl   = el(EMPTY_ID);
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
          emptyEl.textContent = 'Unable to load auditions. Please try again later.';
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
