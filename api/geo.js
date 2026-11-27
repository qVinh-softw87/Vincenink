// Vị trí gần đúng theo IP — Vercel tự gắn các header x-vercel-ip-* vào mỗi request.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const h = k => { const v = req.headers[k]; try { return v ? decodeURIComponent(String(v)) : ''; } catch (e) { return String(v || ''); } };
  const lat = parseFloat(h('x-vercel-ip-latitude')), lon = parseFloat(h('x-vercel-ip-longitude'));
  if (!isFinite(lat) || !isFinite(lon)) return res.status(404).json({ error: 'no_geo' });
  res.status(200).json({ lat, lon, city: h('x-vercel-ip-city'), region: h('x-vercel-ip-country-region'), country: h('x-vercel-ip-country') });
};
