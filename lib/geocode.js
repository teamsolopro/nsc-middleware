const https = require('https');

/**
 * Geocode a US address using the free Census Bureau Geocoding API.
 * Returns { lat, lng } or null if no match found.
 */
function geocodeAddress({ address, city, state, zip }) {
  return new Promise((resolve) => {
    if (!address || !city || !state) return resolve(null);

    const params = new URLSearchParams({
      street:    address,
      city:      city,
      state:     state,
      benchmark: '2020',
      format:    'json',
    });
    if (zip) params.set('zip', zip);

    const url = `https://geocoding.geo.census.gov/geocoder/locations/address?${params}`;

    https.get(url, { timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const match = json.result && json.result.addressMatches && json.result.addressMatches[0];
          if (!match) return resolve(null);
          resolve({
            lat: match.coordinates.y,
            lng: match.coordinates.x,
          });
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null))
      .on('timeout', function() { this.destroy(); resolve(null); });
  });
}

module.exports = { geocodeAddress };
