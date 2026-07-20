/* nsc-modals.js — Shared Add Company / Add Venue modals for all NSC public forms.
 * Usage:
 *   NscModals.openCompany({ railwayUrl, onSave: function(co) { ... } })
 *   NscModals.openVenue({ railwayUrl, companyId, onSave: function(venue) { ... } })
 * onSave receives: { id, name, city, state, homeVenueIds } or { id, name, city, state, linkedCompanyId }
 */
(function () {
  'use strict';

  var COUNTIES = {
    NC: ['Alamance','Alexander','Alleghany','Anson','Ashe','Avery','Beaufort','Bertie','Bladen',
      'Brunswick','Buncombe','Burke','Cabarrus','Caldwell','Camden','Carteret','Caswell',
      'Catawba','Chatham','Cherokee','Chowan','Clay','Cleveland','Columbus','Craven',
      'Cumberland','Currituck','Dare','Davidson','Davie','Duplin','Durham','Edgecombe',
      'Forsyth','Franklin','Gaston','Gates','Graham','Granville','Greene','Guilford',
      'Halifax','Harnett','Haywood','Henderson','Hertford','Hoke','Hyde','Iredell',
      'Jackson','Johnston','Jones','Lee','Lenoir','Lincoln','McDowell','Macon','Madison',
      'Martin','Mecklenburg','Mitchell','Montgomery','Moore','Nash','New Hanover',
      'Northampton','Onslow','Orange','Pamlico','Pasquotank','Pender','Perquimans',
      'Person','Pitt','Polk','Randolph','Richmond','Robeson','Rockingham','Rowan',
      'Rutherford','Sampson','Scotland','Stanly','Stokes','Surry','Swain','Transylvania',
      'Tyrrell','Union','Vance','Wake','Warren','Washington','Watauga','Wayne','Wilkes',
      'Wilson','Yadkin','Yancey'],
    SC: ['Abbeville','Aiken','Allendale','Anderson','Bamberg','Barnwell','Beaufort','Berkeley',
      'Calhoun','Charleston','Cherokee','Chester','Chesterfield','Clarendon','Colleton',
      'Darlington','Dillon','Dorchester','Edgefield','Fairfield','Florence','Georgetown',
      'Greenville','Greenwood','Hampton','Horry','Jasper','Kershaw','Lancaster','Laurens',
      'Lee','Lexington','McCormick','Marion','Marlboro','Newberry','Oconee','Orangeburg',
      'Pickens','Richland','Saluda','Spartanburg','Sumter','Union','Williamsburg','York']
  };

  var _companyCallback = null;
  var _venueCallback   = null;
  var _railwayUrl      = '';
  var _venueCompanyId  = '';
  var _pendingLogoUrl  = '';
  var _injected        = false;

  function inject() {
    if (_injected) return;
    _injected = true;

    var wrap = document.createElement('div');
    wrap.innerHTML = [
      '<div class="nsc-modal-backdrop" id="nscm-company-modal">',
      '  <div class="nsc-modal">',
      '    <button class="nsc-modal-close" onclick="NscModals._closeCompany()">&times;</button>',
      '    <h2>Add New Company</h2>',
      '    <p class="nsc-modal-error" id="nscm-company-error" style="display:none"></p>',
      '    <div class="nsc-field"><label>Company Name <span class="req">*</span></label><input type="text" id="nscm-mc-name"></div>',
      '    <div class="nsc-field"><label>Website</label><input type="url" id="nscm-mc-website" placeholder="https://..."></div>',
      '    <div class="nsc-field-row">',
      '      <div class="nsc-field"><label>City <span class="req">*</span></label><input type="text" id="nscm-mc-city"></div>',
      '      <div class="nsc-field"><label>State <span class="req">*</span></label>',
      '        <select id="nscm-mc-state"><option value="">—</option><option value="NC">NC</option><option value="SC">SC</option></select>',
      '      </div>',
      '    </div>',
      '    <div class="nsc-field"><label>Region</label>',
      '      <select id="nscm-mc-region">',
      '        <option value="">— Select Region —</option>',
      '        <option value="Triad">Triad (Greensboro / Winston-Salem / High Point)</option>',
      '        <option value="Triangle">Triangle (Raleigh / Durham / Chapel Hill)</option>',
      '        <option value="Charlotte metro">Charlotte Metro</option>',
      '        <option value="Wilmington / Cape Fear">Wilmington / Cape Fear</option>',
      '        <option value="Asheville / Western NC">Asheville / Western NC</option>',
      '        <option value="Lowcountry">Lowcountry (Charleston / Hilton Head)</option>',
      '        <option value="Upstate SC">Upstate SC (Greenville / Spartanburg)</option>',
      '        <option value="Eastern NC">Eastern NC</option>',
      '        <option value="Sandhills">Sandhills</option>',
      '        <option value="Piedmont">Piedmont</option>',
      '        <option value="Outer Banks">Outer Banks</option>',
      '        <option value="Midlands">Midlands</option>',
      '        <option value="Pee Dee">Pee Dee</option>',
      '        <option value="Other NC">Other NC</option>',
      '        <option value="Other SC">Other SC</option>',
      '      </select>',
      '    </div>',
      '    <div class="nsc-field">',
      '      <label>Logo</label>',
      '      <input type="file" id="nscm-mc-logo-file" accept="image/*" style="font-size:13px">',
      '      <span id="nscm-mc-logo-status" style="font-size:12px;color:#666;display:block;margin-top:4px"></span>',
      '      <img id="nscm-mc-logo-preview" style="display:none;max-height:60px;max-width:160px;margin-top:6px;border-radius:4px;border:1px solid #eee;padding:4px;background:#fff" alt="Logo preview">',
      '    </div>',
      '    <p style="font-size:12px;font-weight:600;margin:16px 0 4px;color:#555;text-transform:uppercase;letter-spacing:.05em">Social Links</p>',
      '    <div class="nsc-field"><label>Facebook</label><input type="url" id="nscm-mc-facebook" placeholder="https://facebook.com/..."></div>',
      '    <div class="nsc-field"><label>Instagram</label><input type="url" id="nscm-mc-instagram" placeholder="https://instagram.com/..."></div>',
      '    <div class="nsc-field"><label>Twitter / X</label><input type="url" id="nscm-mc-twitter" placeholder="https://x.com/..."></div>',
      '    <div class="nsc-field"><label>TikTok</label><input type="url" id="nscm-mc-tiktok" placeholder="https://tiktok.com/@..."></div>',
      '    <div class="nsc-field"><label>YouTube</label><input type="url" id="nscm-mc-youtube" placeholder="https://youtube.com/@..."></div>',
      '    <div class="nsc-field"><label>Contact Name <span class="req">*</span></label><input type="text" id="nscm-mc-contact-name"></div>',
      '    <div class="nsc-field"><label>Contact Email <span class="req">*</span></label><input type="email" id="nscm-mc-contact-email"></div>',
      '    <div class="nsc-field"><label>Contact Phone</label><input type="tel" id="nscm-mc-contact-phone"></div>',
      '    <div class="nsc-btn-row" style="border:none;padding:0;margin-top:24px">',
      '      <button class="nsc-btn nsc-btn-ghost" onclick="NscModals._closeCompany()">Cancel</button>',
      '      <button class="nsc-btn nsc-btn-primary" id="nscm-company-save-btn" onclick="NscModals._saveCompany()">Save Company</button>',
      '    </div>',
      '  </div>',
      '</div>',
      '<div class="nsc-modal-backdrop" id="nscm-venue-modal">',
      '  <div class="nsc-modal">',
      '    <button class="nsc-modal-close" onclick="NscModals._closeVenue()">&times;</button>',
      '    <h2>Add New Venue</h2>',
      '    <p class="nsc-modal-error" id="nscm-venue-error" style="display:none"></p>',
      '    <div class="nsc-field"><label>Venue Name <span class="req">*</span></label><input type="text" id="nscm-mv-name"></div>',
      '    <div class="nsc-field"><label>Address <span class="req">*</span></label><input type="text" id="nscm-mv-address"></div>',
      '    <div class="nsc-field-row">',
      '      <div class="nsc-field"><label>City <span class="req">*</span></label><input type="text" id="nscm-mv-city"></div>',
      '      <div class="nsc-field"><label>State <span class="req">*</span></label>',
      '        <select id="nscm-mv-state" onchange="NscModals._updateCounties(this.value)"><option value="">—</option><option value="NC">NC</option><option value="SC">SC</option></select>',
      '      </div>',
      '    </div>',
      '    <div class="nsc-field">',
      '      <label>County <span class="req">*</span></label>',
      '      <select id="nscm-mv-county" disabled><option value="">— Select State First —</option></select>',
      '    </div>',
      '    <div class="nsc-field-row">',
      '      <div class="nsc-field"><label>Zip <span class="req">*</span></label><input type="text" id="nscm-mv-zip"></div>',
      '      <div class="nsc-field"><label>Venue Type <span class="req">*</span></label>',
      '        <select id="nscm-mv-type">',
      '          <option value="">—</option>',
      '          <option value="proscenium">Proscenium</option>',
      '          <option value="black_box">Black Box</option>',
      '          <option value="thrust">Thrust</option>',
      '          <option value="arena">Arena</option>',
      '          <option value="outdoor">Outdoor</option>',
      '          <option value="other">Other</option>',
      '        </select>',
      '      </div>',
      '    </div>',
      '    <div class="nsc-field"><label>Seating Capacity</label><input type="number" id="nscm-mv-capacity" min="0"></div>',
      '    <div class="nsc-btn-row" style="border:none;padding:0;margin-top:24px">',
      '      <button class="nsc-btn nsc-btn-ghost" onclick="NscModals._closeVenue()">Cancel</button>',
      '      <button class="nsc-btn nsc-btn-primary" id="nscm-venue-save-btn" onclick="NscModals._saveVenue()">Save Venue</button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');

    document.body.appendChild(wrap);

    document.getElementById('nscm-company-modal').addEventListener('click', function (e) {
      if (e.target === this) NscModals._closeCompany();
    });

    document.getElementById('nscm-mc-logo-file').addEventListener('change', function () {
      var file = this.files[0];
      if (!file) return;
      var statusEl  = g('nscm-mc-logo-status');
      var previewEl = g('nscm-mc-logo-preview');
      statusEl.textContent = 'Uploading…';
      var fd = new FormData();
      fd.append('file', file);
      fetch(_railwayUrl + '/webhook/upload-logo', { method: 'POST', body: fd })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.url) throw new Error('No URL');
          _pendingLogoUrl = data.url;
          statusEl.textContent = 'Uploaded ✓';
          previewEl.src = data.url;
          previewEl.style.display = 'block';
        })
        .catch(function () {
          statusEl.textContent = 'Upload failed — try again.';
        });
    });
    document.getElementById('nscm-venue-modal').addEventListener('click', function (e) {
      if (e.target === this) NscModals._closeVenue();
    });
  }

  function g(id) { return document.getElementById(id); }
  function v(id) { var e = g(id); return e ? e.value.trim() : ''; }

  function resetCompanyForm() {
    ['nscm-mc-name','nscm-mc-website','nscm-mc-city','nscm-mc-state','nscm-mc-region',
     'nscm-mc-facebook','nscm-mc-instagram','nscm-mc-twitter','nscm-mc-tiktok','nscm-mc-youtube',
     'nscm-mc-contact-name','nscm-mc-contact-email','nscm-mc-contact-phone']
      .forEach(function (id) { var e = g(id); if (e) e.value = ''; });
    var logoFile = g('nscm-mc-logo-file'); if (logoFile) logoFile.value = '';
    var logoStatus = g('nscm-mc-logo-status'); if (logoStatus) logoStatus.textContent = '';
    var logoPreview = g('nscm-mc-logo-preview'); if (logoPreview) { logoPreview.src = ''; logoPreview.style.display = 'none'; }
    _pendingLogoUrl = '';
    var err = g('nscm-company-error');
    if (err) { err.textContent = ''; err.style.display = 'none'; }
    var btn = g('nscm-company-save-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Company'; }
  }

  function resetVenueForm() {
    ['nscm-mv-name','nscm-mv-address','nscm-mv-city','nscm-mv-state',
     'nscm-mv-zip','nscm-mv-type','nscm-mv-capacity']
      .forEach(function (id) { var e = g(id); if (e) e.value = ''; });
    NscModals._updateCounties('');
    var err = g('nscm-venue-error');
    if (err) { err.textContent = ''; err.style.display = 'none'; }
    var btn = g('nscm-venue-save-btn');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Venue'; }
  }

  window.NscModals = {

    openCompany: function (opts) {
      inject();
      _railwayUrl = (opts && opts.railwayUrl) || '';
      _companyCallback = (opts && opts.onSave) || null;
      resetCompanyForm();
      g('nscm-company-modal').classList.add('open');
    },

    openVenue: function (opts) {
      inject();
      _railwayUrl     = (opts && opts.railwayUrl)  || '';
      _venueCompanyId = (opts && opts.companyId)   || '';
      _venueCallback  = (opts && opts.onSave)      || null;
      resetVenueForm();
      g('nscm-venue-modal').classList.add('open');
    },

    _closeCompany: function () { g('nscm-company-modal').classList.remove('open'); },
    _closeVenue:   function () { g('nscm-venue-modal').classList.remove('open'); },

    _updateCounties: function (stateVal) {
      var sel = g('nscm-mv-county');
      if (!sel) return;
      if (!stateVal || !COUNTIES[stateVal]) {
        sel.innerHTML = '<option value="">— Select State First —</option>';
        sel.disabled = true;
        return;
      }
      sel.innerHTML = '<option value="">— Select County —</option>';
      COUNTIES[stateVal].forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c; opt.textContent = c + ' County';
        sel.appendChild(opt);
      });
      sel.disabled = false;
    },

    _saveCompany: function () {
      var name         = v('nscm-mc-name');
      var city         = v('nscm-mc-city');
      var state_       = v('nscm-mc-state');
      var contactName  = v('nscm-mc-contact-name');
      var contactEmail = v('nscm-mc-contact-email');
      var errEl        = g('nscm-company-error');

      if (!name || !city || !state_ || !contactName || !contactEmail) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';

      var btn = g('nscm-company-save-btn');
      btn.disabled = true; btn.textContent = 'Saving…';

      fetch(_railwayUrl + '/webhook/submit-company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name, city: city, state: state_,
          region:       v('nscm-mc-region')         || null,
          website:      v('nscm-mc-website')         || null,
          logoUrl:      _pendingLogoUrl              || null,
          facebook:     v('nscm-mc-facebook')        || null,
          instagram:    v('nscm-mc-instagram')       || null,
          twitter:      v('nscm-mc-twitter')         || null,
          tiktok:       v('nscm-mc-tiktok')          || null,
          youtube:      v('nscm-mc-youtube')         || null,
          contactName:  contactName,
          contactEmail: contactEmail,
          contactPhone: v('nscm-mc-contact-phone')   || null,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.id) throw new Error('No ID returned');
          NscModals._closeCompany();
          btn.disabled = false; btn.textContent = 'Save Company';
          if (_companyCallback) _companyCallback({ id: data.id, name: data.name || name, city: city, state: state_, region: v('nscm-mc-region') || null, homeVenueIds: [] });
        })
        .catch(function () {
          errEl.textContent = 'Unable to save company. Please try again.';
          errEl.style.display = 'block';
          btn.disabled = false; btn.textContent = 'Save Company';
        });
    },

    _saveVenue: function () {
      var name    = v('nscm-mv-name');
      var address = v('nscm-mv-address');
      var city    = v('nscm-mv-city');
      var state_  = v('nscm-mv-state');
      var county  = v('nscm-mv-county');
      var zip     = v('nscm-mv-zip');
      var type    = v('nscm-mv-type');
      var errEl   = g('nscm-venue-error');

      if (!name || !address || !city || !state_ || !county || !zip || !type) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.style.display = 'block';
        return;
      }
      errEl.style.display = 'none';

      var btn = g('nscm-venue-save-btn');
      btn.disabled = true; btn.textContent = 'Saving…';

      var cap = v('nscm-mv-capacity');
      fetch(_railwayUrl + '/webhook/submit-venue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name, address: address, city: city, state: state_,
          county: county, zip: zip, type: type,
          capacity: cap ? parseInt(cap, 10) : null,
          linkedCompanyId: _venueCompanyId,
        }),
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.id) throw new Error('No ID returned');
          NscModals._closeVenue();
          btn.disabled = false; btn.textContent = 'Save Venue';
          if (_venueCallback) _venueCallback({ id: data.id, name: data.name || name, city: city, state: state_, linkedCompanyId: _venueCompanyId });
        })
        .catch(function () {
          errEl.textContent = 'Unable to save venue. Please try again.';
          errEl.style.display = 'block';
          btn.disabled = false; btn.textContent = 'Save Venue';
        });
    },
  };
})();
