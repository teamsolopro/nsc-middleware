(function () {
  'use strict';

  var CDN          = 'https://cdn.neighborhoodstage.com/data/auditions.json';
  var CONTAINER_ID = 'nsc-audition-detail';

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
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatDateShort(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10);
    var m = parts[1] || '00';
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + (m !== '00' ? ':' + m : '') + ampm;
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function checkItem(label, value) {
    return '<li class="nsc-req-item' + (value ? ' nsc-req-yes' : ' nsc-req-no') + '">' +
      (value ? '&#10003;' : '&#10007;') + ' ' + label + '</li>';
  }

  function renderDetail(a) {
    var company        = (a.linkedCompanyId && a.linkedCompanyId.name) || '';
    var companyWebsite = (a.linkedCompanyId && a.linkedCompanyId.website) || '';
    var venue          = (a.linkedVenueId && a.linkedVenueId.name) || '';
    var address        = (a.linkedVenueId && a.linkedVenueId.address) || '';
    var city           = (a.linkedVenueId && a.linkedVenueId.city) || '';
    var state          = (a.linkedVenueId && a.linkedVenueId.state) || '';
    var mapUrl         = (a.linkedVenueId && a.linkedVenueId.mapUrl) || '';
    var location       = [address, city, state].filter(Boolean).join(', ');

    var title    = esc((a.show && a.show.title) || 'Untitled');
    var author   = (a.show && a.show.author)   ? 'by ' + esc(a.show.author)   : '';
    var composer = (a.show && a.show.composer) ? 'Music by ' + esc(a.show.composer) : '';
    var showType = (a.show && a.show.type) ? a.show.type.charAt(0).toUpperCase() + a.show.type.slice(1) : '';
    var union    = (a.show && a.show.unionType) || '';
    var desc     = (a.show && a.show.description) || '';

    var showOpens  = a.show && a.show.showDates && a.show.showDates.opens  ? formatDateShort(a.show.showDates.opens)  : '';
    var showCloses = a.show && a.show.showDates && a.show.showDates.closes ? formatDateShort(a.show.showDates.closes) : '';
    var showRange  = (showOpens && showCloses) ? showOpens + ' &ndash; ' + showCloses : showOpens || '';
    var rehearsal  = a.rehearsalStart ? formatDateShort(a.rehearsalStart) : '';

    // Audition dates
    var auditionDatesHtml = '';
    if (a.auditionDates && a.auditionDates.length > 0) {
      auditionDatesHtml = '<ul class="nsc-audition-dates">' +
        a.auditionDates.filter(function (d) { return d.date; }).map(function (d) {
          var time = '';
          if (d.startTime) time += formatTime(d.startTime);
          if (d.endTime)   time += ' &ndash; ' + formatTime(d.endTime);
          var fmt = d.format ? ' <span class="nsc-date-format">(' + esc(d.format) + ')</span>' : '';
          return '<li><strong>' + formatDate(d.date) + '</strong>' +
            (time ? ' &middot; ' + time : '') + fmt + '</li>';
        }).join('') +
      '</ul>';
    }

    // Age ranges
    var ages = (a.ageRanges && a.ageRanges.length > 0)
      ? a.ageRanges.map(function (r) { return r.replace('_', ' '); }).join(', ')
      : '';

    // Gender
    var genders = [];
    if (a.genderOpen)   genders.push('Open casting');
    if (a.genderMale)   genders.push('Male roles available');
    if (a.genderFemale) genders.push('Female roles available');

    // Roles
    var rolesHtml = '';
    if (a.roles && a.roles.length > 0) {
      rolesHtml = [
        '<div class="nsc-detail-section">',
          '<h2 class="nsc-detail-subheading">Roles</h2>',
          '<table class="nsc-cast-table">',
            '<tr><th>Role</th><th>Voice Type</th><th>Age Range</th><th>Gender</th></tr>',
            a.roles.map(function (r) {
              return '<tr>' +
                '<td><strong>' + esc(r.name) + '</strong>' + (r.notes ? '<br><span style="font-size:12px;color:#777">' + esc(r.notes) + '</span>' : '') + '</td>' +
                '<td>' + esc(r.voiceType) + '</td>' +
                '<td>' + esc(r.ageRange) + '</td>' +
                '<td>' + esc(r.gender) + '</td>' +
              '</tr>';
            }).join(''),
          '</table>',
        '</div>',
      ].join('');
    }

    // Requirements
    var req = a.requirements || {};
    var reqHtml = [
      '<div class="nsc-detail-section">',
        '<h2 class="nsc-detail-subheading">What to Prepare</h2>',
        '<ul class="nsc-req-list">',
          checkItem('Prepared Song', req.preparedSong),
          checkItem('Cold Reading', req.coldReading),
          checkItem('Prepared Reading', req.preparedReading),
          checkItem('Dance', req.dance),
          checkItem('Headshot', req.headshot),
          checkItem('Resume', req.resume),
        '</ul>',
        req.songLength      ? '<p class="nsc-detail-meta"><strong>Song length:</strong> ' + esc(req.songLength) + '</p>' : '',
        req.callbacks       ? '<p class="nsc-detail-meta"><strong>Callbacks:</strong> ' + esc(req.callbacks) + '</p>' : '',
        req.conflictDates   ? '<p class="nsc-detail-meta"><strong>Conflict dates:</strong> ' + esc(req.conflictDates) + '</p>' : '',
        req.additionalNotes ? '<p class="nsc-detail-meta"><strong>Additional notes:</strong> ' + nl2br(req.additionalNotes) + '</p>' : '',
      '</div>',
    ].join('');

    // Contact
    var contact = a.contactName || a.contactEmail || a.contactPhone;
    var contactHtml = contact ? [
      '<div class="nsc-detail-section">',
        '<h2 class="nsc-detail-subheading">Contact</h2>',
        a.contactName  ? '<p class="nsc-detail-meta"><strong>' + esc(a.contactName) + '</strong></p>' : '',
        a.contactEmail ? '<p class="nsc-detail-meta"><a class="nsc-detail-link" href="mailto:' + esc(a.contactEmail) + '">' + esc(a.contactEmail) + '</a></p>' : '',
        a.contactPhone ? '<p class="nsc-detail-meta">' + esc(a.contactPhone) + '</p>' : '',
      '</div>',
    ].join('') : '';

    return [
      '<div class="nsc-detail-wrap">',

        // Main column
        '<div class="nsc-detail-main">',
          '<div class="nsc-detail-header">',
            '<span class="nsc-card-label">' + esc(showType) + (union ? ' &middot; ' + esc(union) : '') + '</span>',
            '<h1 class="nsc-detail-title">' + title + '</h1>',
            author   ? '<p class="nsc-detail-byline">' + author + '</p>' : '',
            composer ? '<p class="nsc-detail-byline">' + composer + '</p>' : '',
            company  ? '<p class="nsc-detail-byline">Presented by ' + esc(company) + '</p>' : '',
          '</div>',

          desc ? '<div class="nsc-detail-section"><p class="nsc-detail-desc">' + nl2br(desc) + '</p></div>' : '',

          '<div class="nsc-detail-section">',
            '<h2 class="nsc-detail-subheading">Audition Dates</h2>',
            auditionDatesHtml || '<p class="nsc-detail-meta">See contact for dates.</p>',
            venue || location
              ? '<p class="nsc-detail-meta" style="margin-top:8px">&#128205; ' +
                [venue, location].filter(Boolean).join(' &mdash; ') +
                (mapUrl ? ' <a class="nsc-detail-link" href="' + esc(mapUrl) + '" target="_blank" rel="noopener">Map &rarr;</a>' : '') +
                '</p>'
              : '',
          '</div>',

          rolesHtml,
          reqHtml,
          contactHtml,
        '</div>',

        // Sidebar
        '<aside class="nsc-detail-sidebar">',

          '<div class="nsc-detail-section">',
            '<h2 class="nsc-detail-subheading">Production Info</h2>',
            showRange  ? '<p class="nsc-detail-meta">&#127917; Runs ' + showRange + '</p>' : '',
            rehearsal  ? '<p class="nsc-detail-meta">&#128197; Rehearsals begin ' + esc(rehearsal) + '</p>' : '',
            ages       ? '<p class="nsc-detail-meta">&#128101; ' + esc(ages) + '</p>' : '',
            genders.length > 0 ? '<p class="nsc-detail-meta">&#9881; ' + genders.map(esc).join(', ') + '</p>' : '',
          '</div>',

          company ? [
            '<div class="nsc-detail-section">',
              '<h2 class="nsc-detail-subheading">Presented By</h2>',
              '<p class="nsc-detail-company">' + esc(company) + '</p>',
              companyWebsite ? '<a class="nsc-detail-link" href="' + esc(companyWebsite) + '" target="_blank" rel="noopener">Visit Website &rarr;</a>' : '',
            '</div>',
          ].join('') : '',

          '<div class="nsc-detail-section">',
            '<a class="nsc-detail-link" href="/auditions">&larr; Back to All Auditions</a>',
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
      container.innerHTML = '<p class="nsc-empty">No audition specified.</p>';
      return;
    }

    container.innerHTML = '<p style="font-family:\'Lato\',sans-serif;color:#999">Loading…</p>';

    fetch(CDN)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var audition = null;
        for (var i = 0; i < data.length; i++) {
          if (data[i]._id === id) { audition = data[i]; break; }
        }
        if (!audition) {
          container.innerHTML = '<p class="nsc-empty">Audition not found. It may have been removed or the link is incorrect.</p>';
          return;
        }
        if (audition.show && audition.show.title) {
          document.title = audition.show.title + ' Auditions — Neighborhood Stage Carolinas';
        }
        container.innerHTML = renderDetail(audition);
      })
      .catch(function () {
        container.innerHTML = '<p class="nsc-empty">Unable to load audition details. Please try again later.</p>';
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
