(function () {
  'use strict';

  var CDN = 'https://cdn.neighborhoodstage.com/data';
  var CONTAINER_ID = 'nsc-company-detail';

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function nl2br(str) {
    return esc(str).replace(/\n/g, '<br>');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  // ─── Section builders ──────────────────────────────────────

  function buildVenuesSection(company, venues) {
    if (!company.homeVenueIds || company.homeVenueIds.length === 0) return '';
    var ids = company.homeVenueIds.map(String);
    var matched = venues.filter(function (v) { return ids.indexOf(String(v._id)) > -1; });
    if (matched.length === 0) return '';
    return '<section class="nsc-co-section">' +
      '<h2 class="nsc-co-section-title">Venues</h2>' +
      '<div class="nsc-co-venue-list">' +
        matched.map(function (v) {
          var addr = [v.address, v.city, v.state].filter(Boolean).join(', ');
          return '<div class="nsc-co-venue-card">' +
            '<strong>' + esc(v.name) + '</strong>' +
            (addr ? '<br><span class="nsc-co-meta">' + esc(addr) + '</span>' : '') +
            (v.mapUrl ? ' &mdash; <a class="nsc-co-link" href="' + esc(v.mapUrl) + '" target="_blank" rel="noopener">Map</a>' : '') +
          '</div>';
        }).join('') +
      '</div>' +
    '</section>';
  }

  function buildProductionCard(p) {
    var title = (p.show && p.show.title) || 'Untitled';
    var types = (p.show && p.show.showType && p.show.showType.length)
      ? p.show.showType
      : (p.show && p.show.type ? [p.show.type] : []);
    var typeStr = types.map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' '); }).join(' / ');
    var opens  = p.dates && p.dates.opens  ? formatDate(p.dates.opens)  : '';
    var closes = p.dates && p.dates.closes ? formatDate(p.dates.closes) : '';
    var dateRange = (opens && closes) ? opens + ' &ndash; ' + closes : opens || '';
    var venue = (p.linkedVenueId && p.linkedVenueId.name) || '';
    var poster = p.show && p.show.posterImageUrl;
    return '<a href="/shows/detail?id=' + esc(p._id) + '" class="nsc-co-prod-card">' +
      (poster ? '<img src="' + esc(poster) + '" class="nsc-co-prod-poster" alt="' + esc(title) + ' poster">' : '<div class="nsc-co-prod-poster nsc-co-prod-no-poster"></div>') +
      '<div class="nsc-co-prod-info">' +
        (typeStr ? '<span class="nsc-card-label">' + esc(typeStr) + '</span>' : '') +
        '<h3 class="nsc-co-prod-title">' + esc(title) + '</h3>' +
        (dateRange ? '<p class="nsc-co-meta">' + dateRange + '</p>' : '') +
        (venue     ? '<p class="nsc-co-meta">' + esc(venue) + '</p>' : '') +
      '</div>' +
    '</a>';
  }

  function buildProductionsSection(label, productions, company) {
    var slug = company.slug;
    var matched = productions.filter(function (p) {
      return p.linkedCompanyId && p.linkedCompanyId.slug === slug;
    });
    if (matched.length === 0) return '';
    return '<section class="nsc-co-section">' +
      '<h2 class="nsc-co-section-title">' + label + '</h2>' +
      '<div class="nsc-co-prod-grid">' +
        matched.map(buildProductionCard).join('') +
      '</div>' +
    '</section>';
  }

  function buildAuditionCard(a) {
    var title = (a.show && a.show.title) || 'Untitled';
    var types = (a.show && a.show.showType && a.show.showType.length)
      ? a.show.showType
      : (a.show && a.show.type ? [a.show.type] : []);
    var typeStr = types.map(function (t) { return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' '); }).join(' / ');
    var firstDate = a.auditionDates && a.auditionDates[0] && a.auditionDates[0].date
      ? formatDate(a.auditionDates[0].date) : '';
    var venue = (a.linkedVenueId && a.linkedVenueId.name) || '';
    return '<a href="/auditions/detail?id=' + esc(a._id) + '" class="nsc-co-aud-card">' +
      '<div class="nsc-co-aud-info">' +
        (typeStr   ? '<span class="nsc-card-label">' + esc(typeStr) + '</span>' : '') +
        '<h3 class="nsc-co-prod-title">' + esc(title) + '</h3>' +
        (firstDate ? '<p class="nsc-co-meta">Auditions: ' + firstDate + '</p>' : '') +
        (venue     ? '<p class="nsc-co-meta">' + esc(venue) + '</p>' : '') +
      '</div>' +
    '</a>';
  }

  function buildAuditionsSection(auditions, company) {
    var slug = company.slug;
    var matched = auditions.filter(function (a) {
      return a.linkedCompanyId && a.linkedCompanyId.slug === slug;
    });
    if (matched.length === 0) return '';
    return '<section class="nsc-co-section">' +
      '<h2 class="nsc-co-section-title">Upcoming Auditions</h2>' +
      '<div class="nsc-co-aud-list">' +
        matched.map(buildAuditionCard).join('') +
      '</div>' +
    '</section>';
  }

  function buildPastSection(pastProductions, company) {
    if (!pastProductions) return '';
    var slug = company.slug;
    var matched = pastProductions.filter(function (p) {
      return p.linkedCompanyId && (p.linkedCompanyId.slug === slug || String(p.linkedCompanyId) === String(company._id));
    });
    if (matched.length === 0) return '';
    matched.sort(function (a, b) {
      var aClose = a.dates && a.dates.closes ? new Date(a.dates.closes) : 0;
      var bClose = b.dates && b.dates.closes ? new Date(b.dates.closes) : 0;
      return bClose - aClose;
    });
    return '<section class="nsc-co-section">' +
      '<h2 class="nsc-co-section-title">Past Productions</h2>' +
      '<table class="nsc-co-past-table">' +
        '<thead><tr><th>Title</th><th>Ran</th><th>Venue</th></tr></thead>' +
        '<tbody>' +
          matched.map(function (p) {
            var title = (p.show && p.show.title) || 'Untitled';
            var opens  = p.dates && p.dates.opens  ? formatDate(p.dates.opens)  : '';
            var closes = p.dates && p.dates.closes ? formatDate(p.dates.closes) : '';
            var dateRange = (opens && closes) ? opens + ' &ndash; ' + closes : opens || closes || '—';
            var venue = (p.linkedVenueId && p.linkedVenueId.name) || '—';
            return '<tr>' +
              '<td>' + esc(title) + '</td>' +
              '<td>' + dateRange + '</td>' +
              '<td>' + esc(venue) + '</td>' +
            '</tr>';
          }).join('') +
        '</tbody>' +
      '</table>' +
    '</section>';
  }

  function renderDetail(company, venues, productions, auditions, pastProductions) {
    var location = [company.city, company.state].filter(Boolean).join(', ');
    var social = company.socialLinks || {};
    var socialLinks = [
      social.facebook  ? '<a class="nsc-co-social" href="' + esc(social.facebook)  + '" target="_blank" rel="noopener">Facebook</a>'  : '',
      social.instagram ? '<a class="nsc-co-social" href="' + esc(social.instagram) + '" target="_blank" rel="noopener">Instagram</a>' : '',
      social.twitter   ? '<a class="nsc-co-social" href="' + esc(social.twitter)   + '" target="_blank" rel="noopener">Twitter/X</a>' : '',
      social.tiktok    ? '<a class="nsc-co-social" href="' + esc(social.tiktok)    + '" target="_blank" rel="noopener">TikTok</a>'    : '',
      social.youtube   ? '<a class="nsc-co-social" href="' + esc(social.youtube)   + '" target="_blank" rel="noopener">YouTube</a>'   : '',
    ].filter(Boolean).join('');

    return '<div class="nsc-co-detail">' +

      // Header
      '<div class="nsc-co-header">' +
        (company.logoUrl
          ? '<img src="' + esc(company.logoUrl) + '" alt="' + esc(company.name) + ' logo" class="nsc-co-detail-logo">'
          : '') +
        '<div class="nsc-co-header-info">' +
          '<h1 class="nsc-co-detail-name">' + esc(company.name) + '</h1>' +
          (location ? '<p class="nsc-co-meta">' + esc(location) + '</p>' : '') +
          (company.region ? '<p class="nsc-co-meta">' + esc(company.region) + '</p>' : '') +
          (company.website
            ? '<a class="nsc-co-website" href="' + esc(company.website) + '" target="_blank" rel="noopener">Visit Website &rarr;</a>'
            : '') +
          (socialLinks ? '<div class="nsc-co-social-row">' + socialLinks + '</div>' : '') +
        '</div>' +
      '</div>' +

      // Bio
      (company.bio
        ? '<section class="nsc-co-section"><p class="nsc-co-bio">' + nl2br(company.bio) + '</p></section>'
        : '') +

      buildVenuesSection(company, venues) +
      buildProductionsSection('Upcoming Productions', productions, company) +
      buildAuditionsSection(auditions, company) +
      buildPastSection(pastProductions, company) +

      '<div class="nsc-co-back"><a href="/companies">&larr; Back to All Companies</a></div>' +

    '</div>';
  }

  function init() {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    var slug = getQueryParam('company');
    if (!slug) {
      container.innerHTML = '<p class="nsc-empty">No company specified.</p>';
      return;
    }

    container.innerHTML = '<p style="font-family:\'Lato\',sans-serif;color:#999;padding:2rem">Loading…</p>';

    var pastUrl = CDN + '/productionspast.json';

    Promise.all([
      fetch(CDN + '/companies.json').then(function (r) { return r.json(); }),
      fetch(CDN + '/venues.json').then(function (r) { return r.json(); }),
      fetch(CDN + '/productions.json').then(function (r) { return r.json(); }),
      fetch(CDN + '/auditions.json').then(function (r) { return r.json(); }),
      fetch(pastUrl).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
    ]).then(function (results) {
      var companies    = results[0];
      var venues       = results[1];
      var productions  = results[2];
      var auditions    = results[3];
      var pastProds    = results[4];

      var company = null;
      for (var i = 0; i < companies.length; i++) {
        if (companies[i].slug === slug) { company = companies[i]; break; }
      }
      if (!company) {
        container.innerHTML = '<p class="nsc-empty">Company not found. The link may be incorrect.</p>';
        return;
      }

      document.title = company.name + ' — Neighborhood Stage Carolinas';
      container.innerHTML = renderDetail(company, venues, productions, auditions, pastProds);
    }).catch(function () {
      container.innerHTML = '<p class="nsc-empty">Unable to load company details. Please try again later.</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
