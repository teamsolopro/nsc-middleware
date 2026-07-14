(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data';
  var GRID_ID    = 'nsc-companies-grid';
  var COUNT_ID   = 'nsc-companies-count';
  var SEARCH_ID  = 'nsc-co-search';
  var REGION_ID  = 'nsc-co-region';
  var LOADING_ID = 'nsc-co-loading';
  var EMPTY_ID   = 'nsc-co-empty';

  var allCompanies = [];

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function el(id) { return document.getElementById(id); }

  function applyFilters() {
    var search = (el(SEARCH_ID) && el(SEARCH_ID).value || '').toLowerCase().trim();
    var region = el(REGION_ID) && el(REGION_ID).value || '';
    return allCompanies.filter(function (c) {
      if (search && c.name.toLowerCase().indexOf(search) === -1) return false;
      if (region && c.region !== region) return false;
      return true;
    });
  }

  function renderCard(c) {
    var logo = c.logoUrl
      ? '<img src="' + esc(c.logoUrl) + '" alt="' + esc(c.name) + ' logo" class="nsc-co-logo">'
      : '<div class="nsc-co-logo-placeholder">' + esc(c.name.charAt(0).toUpperCase()) + '</div>';
    var location = [c.city, c.state].filter(Boolean).join(', ');
    return '<a href="/companies/detail?company=' + esc(c.slug) + '" class="nsc-co-card">' +
      '<div class="nsc-co-logo-wrap">' + logo + '</div>' +
      '<div class="nsc-co-info">' +
        '<h3 class="nsc-co-name">' + esc(c.name) + '</h3>' +
        (location ? '<p class="nsc-co-location">' + esc(location) + '</p>' : '') +
        (c.region  ? '<p class="nsc-co-region">'   + esc(c.region)   + '</p>' : '') +
      '</div>' +
    '</a>';
  }

  function render() {
    var filtered = applyFilters();
    var countEl = el(COUNT_ID);
    var gridEl  = el(GRID_ID);
    var emptyEl = el(EMPTY_ID);
    if (countEl) countEl.textContent = filtered.length + ' ' + (filtered.length === 1 ? 'company' : 'companies');
    if (filtered.length === 0) {
      if (gridEl)  gridEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
    } else {
      if (emptyEl) emptyEl.style.display = 'none';
      if (gridEl)  gridEl.innerHTML = filtered.map(renderCard).join('');
    }
  }

  function init() {
    var loadingEl = el(LOADING_ID);
    if (loadingEl) loadingEl.style.display = '';

    var searchEl = el(SEARCH_ID);
    var regionEl = el(REGION_ID);
    if (searchEl) searchEl.addEventListener('input', render);
    if (regionEl) regionEl.addEventListener('change', render);

    fetch(CDN + '/companies.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        allCompanies = data.sort(function (a, b) { return a.name.localeCompare(b.name); });
        if (loadingEl) loadingEl.style.display = 'none';
        render();
      })
      .catch(function () {
        if (loadingEl) loadingEl.style.display = 'none';
        var gridEl = el(GRID_ID);
        if (gridEl) gridEl.innerHTML = '<p class="nsc-empty">Unable to load companies. Please try again later.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
