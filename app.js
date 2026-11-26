/* =====================================================================
   Vincenink — Bảng dạy học
   Toàn bộ dữ liệu lưu trong trình duyệt (IndexedDB). Google Drive tuỳ chọn.
   ===================================================================== */
'use strict';

/* ---------------- Tiện ích ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const shortDate = ds => { const [, m, d] = ds.split('-'); return `${d}/${m}`; };
function fmtDateLong(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const fmtTime = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDT = ts => { const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
function fmtSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
const blobToDataURL = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
const dataURLToBlob = async u => (await fetch(u)).blob();
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const scriptCache = {};
function loadScript(src) {
  if (!scriptCache[src]) scriptCache[src] = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true; s.onload = res;
    s.onerror = () => { delete scriptCache[src]; rej(new Error('Không tải được ' + src)); };
    document.head.append(s);
  });
  return scriptCache[src];
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const safeName = s => (s || 'bang').replace(/[\\/:*?"<>|]+/g, '-').trim();

/* ---------------- Biểu tượng ---------------- */
const ICONS = {
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v6"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  marker: '<path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/>',
  eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  lasso: '<path d="M7 22a5 5 0 0 1-2-4"/><path d="M3.3 14A6.8 6.8 0 0 1 2 10c0-4.4 4.5-8 10-8s10 3.6 10 8-4.5 8-10 8a12 12 0 0 1-5-1"/><path d="M5 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>',
  shapes: '<path d="M8.3 10a.7.7 0 0 1-.63-1.08L11.4 3a.7.7 0 0 1 1.2-.04L16.3 8.9a.7.7 0 0 1-.57 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  laser: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  wipe: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  copy: '<rect x="8" y="8" width="14" height="14" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  cloudUp: '<path d="M12 13v8"/><path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="m8 17 4-4 4 4"/>',
  cloudDown: '<path d="M12 13v8l-4-4M12 21l4-4"/><path d="M4.4 15.4A7 7 0 1 1 15.7 9h1.8a4.5 4.5 0 0 1 2.5 8.2"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  sidebar: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  note: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  board: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  fit: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  up: '<path d="m5 12 7-7 7 7M12 19V5"/>',
  down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  edit: '<path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.4 2.6a2.1 2.1 0 1 1 3 3L12 15l-4 1 1-4Z"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  toBoard: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M12 7v7M9 11l3 3 3-3"/>',
  palette: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.7 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1a1.6 1.6 0 0 1 1.6-1.7h2c3.1 0 5.6-2.5 5.6-5.6C22 6 17.5 2 12 2z"/>',
  s_line: '<path d="M5 19 19 5"/>',
  s_arrow: '<path d="M5 19 19 5M9 5h10v10"/>',
  s_rect: '<rect x="4" y="6" width="16" height="12" rx="1"/>',
  s_ellipse: '<ellipse cx="12" cy="12" rx="9" ry="7"/>',
  s_triangle: '<path d="M12 4 21 20H3Z"/>',
  move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
};
const ic = (n, s = 20) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* ---------------- Hằng số ---------------- */
const PAPER = '#FFFCF6';
const COLORS = ['#2F2A25', '#1F4E8C', '#C0392B', '#2E7D4F', '#D98E04', '#7B4FA0', '#D6668A', '#5B8DB8'];
const MARKERS = ['#FFD54A', '#9BE27A', '#FF9EC4', '#8FD3FF', '#FFB067'];
const STUDENT_COLORS = ['#C98B5A', '#7FA37A', '#6F93B8', '#B9798F', '#C9A64B', '#8E7CB0', '#5FA3A0', '#B5674D'];
const BGS = [['plain', 'Trơn'], ['grid', 'Ô vuông'], ['oli', 'Ô li'], ['lines', 'Dòng kẻ'], ['dots', 'Chấm']];
const SIZE_RANGE = { pen: [1, 30], marker: [6, 60], eraser: [8, 120], shape: [1, 20], text: [12, 96] };
const TOOLS = [
  ['hand', 'hand', 'Kéo bảng (H) — hoặc giữ phím Space'],
  ['pen', 'pen', 'Bút viết (P)'],
  ['marker', 'marker', 'Bút dạ quang (M)'],
  ['eraser', 'eraser', 'Tẩy (E)'],
  ['lasso', 'lasso', 'Khoanh vùng (L) — chọn hoặc xoá'],
  ['shape', 'shapes', 'Hình (S)'],
  ['text', 'text', 'Chữ (T)'],
  ['laser', 'laser', 'Bút laser (K) — chỉ để trỏ, tự mờ'],
];

/* ---------------- Cơ sở dữ liệu (IndexedDB) ---------------- */
const DB = {
  db: null,
  open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open('vincenink', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        ['students', 'boards', 'boardData', 'files', 'settings'].forEach(s => { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' }); });
      };
      r.onsuccess = () => { this.db = r.result; res(); };
      r.onerror = () => rej(r.error);
    });
  },
  req(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = this.db.transaction(store, mode); const q = fn(t.objectStore(store));
      t.oncomplete = () => res(q ? q.result : undefined);
      t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  },
  all(s) { return this.req(s, 'readonly', st => st.getAll()); },
  get(s, id) { return this.req(s, 'readonly', st => st.get(id)); },
  put(s, v) { return this.req(s, 'readwrite', st => st.put(v)); },
  del(s, id) { return this.req(s, 'readwrite', st => st.delete(id)); },
  clear(s) { return this.req(s, 'readwrite', st => st.clear()); },
};

/* ---------------- Trạng thái ứng dụng ---------------- */
const S = {
  students: [], boards: [], files: [],
  settings: { id: 'main', penOnly: false, clientId: '', apiKey: '', classNote: '', lastStudent: 'all', lastBoard: null },
  studentId: 'all', boardId: null, tab: 'boards', search: '',
};
const E = {
  items: [], bg: 'grid', view: { x: 0, y: 0, s: 1 },
  tool: 'pen', color: COLORS[0], markerColor: MARKERS[0], penStyle: 'ink', eraserMode: 'part', lassoMode: 'select', shape: 'rect',
  sizes: { pen: 5, marker: 18, eraser: 30, shape: 3, text: 28 },
  undo: [], redo: [], sel: new Set(), cur: null, drag: null, laser: [], hover: null, editing: null,
};
const PREF_KEYS = ['tool', 'color', 'markerColor', 'penStyle', 'eraserMode', 'lassoMode', 'shape', 'sizes'];
function loadPrefs() {
  try { const p = JSON.parse(localStorage.getItem('vincenink.prefs') || '{}'); PREF_KEYS.forEach(k => { if (p[k] !== undefined) E[k] = k === 'sizes' ? { ...E.sizes, ...p[k] } : p[k]; }); } catch (e) { /* bỏ qua */ }
  if (E.tool === 'laser' || E.tool === 'hand') E.tool = 'pen';
}
function savePrefs() { try { const p = {}; PREF_KEYS.forEach(k => p[k] = E[k]); localStorage.setItem('vincenink.prefs', JSON.stringify(p)); } catch (e) { /* bỏ qua */ } }
const saveSettings = () => DB.put('settings', S.settings).catch(() => {});
const studentById = id => S.students.find(s => s.id === id);
const ownerName = id => id === 'all' ? 'Lớp chung' : (studentById(id)?.name || 'Học sinh');
const ownerColor = id => id === 'all' ? null : (studentById(id)?.color || STUDENT_COLORS[0]);
const avatarHTML = (id, cls = '') => id === 'all'
  ? `<span class="avatar class ${cls}">${ic('book', cls ? 20 : 16)}</span>`
  : `<span class="avatar ${cls}" style="background:${ownerColor(id)}">${esc((ownerName(id).trim()[0] || '?').toUpperCase())}</span>`;

/* =====================================================================
   BỘ VẼ (canvas engine)
   ===================================================================== */
const wrap = $('#canvasWrap');
const cv = $('#board');
const ctx = cv.getContext('2d');
const base = document.createElement('canvas');
const bctx = base.getContext('2d');
const mctx = document.createElement('canvas').getContext('2d');
let W = 0, H = 0, DPR = 1, rect = { left: 0, top: 0 };
let baseDirty = true, rafId = 0;
let bbCache = new WeakMap();
const imgCache = new Map();

function resize() {
  const r = wrap.getBoundingClientRect();
  rect = r; W = r.width; H = r.height; DPR = window.devicePixelRatio || 1;
  for (const c of [cv, base]) { c.width = Math.max(1, Math.round(W * DPR)); c.height = Math.max(1, Math.round(H * DPR)); }
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  requestRender(true);
}
const pos = e => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });
const toWorld = p => ({ x: (p.x - E.view.x) / E.view.s, y: (p.y - E.view.y) / E.view.s });
const toScreen = (x, y) => ({ x: x * E.view.s + E.view.x, y: y * E.view.s + E.view.y });
function requestRender(dirty) { if (dirty) baseDirty = true; if (!rafId) rafId = requestAnimationFrame(frame); }

const fontStr = fs => `${fs}px "Be Vietnam Pro", system-ui, sans-serif`;
function textMetrics(it) {
  mctx.font = fontStr(it.fs);
  const lines = it.text.split('\n');
  let w = 0; for (const l of lines) w = Math.max(w, mctx.measureText(l || ' ').width);
  return { w: w + 2, h: lines.length * it.fs * 1.3 };
}
function arrowHead(it) { return Math.max(it.size * 3.5, 12); }
function bbox(it) {
  let b = bbCache.get(it); if (b) return b;
  if (it.type === 'stroke') {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of it.pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const h = it.size / 2 + 1; b = { x: x0 - h, y: y0 - h, w: x1 - x0 + 2 * h, h: y1 - y0 + 2 * h };
  } else if (it.type === 'shape') {
    const h = it.size / 2 + (it.kind === 'arrow' ? arrowHead(it) : 0) + 1;
    const x0 = Math.min(it.x1, it.x2), y0 = Math.min(it.y1, it.y2);
    b = { x: x0 - h, y: y0 - h, w: Math.abs(it.x2 - it.x1) + 2 * h, h: Math.abs(it.y2 - it.y1) + 2 * h };
  } else if (it.type === 'text') {
    const m = textMetrics(it); b = { x: it.x, y: it.y, w: m.w, h: m.h };
  } else b = { x: it.x, y: it.y, w: it.w, h: it.h };
  bbCache.set(it, b); return b;
}
function unionBounds(list) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const it of list) { const b = bbox(it); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
function getImg(src) {
  let im = imgCache.get(src);
  if (!im) { im = new Image(); im.onload = () => requestRender(true); im.src = src; imgCache.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}

/* ---- Vẽ từng đối tượng ---- */
function tracePath(c, pts, cont) {
  if (cont) c.lineTo(pts[0][0], pts[0][1]); else c.moveTo(pts[0][0], pts[0][1]);
  const n = pts.length;
  if (n < 3) { for (let i = 1; i < n; i++) c.lineTo(pts[i][0], pts[i][1]); return; }
  for (let i = 1; i < n - 1; i++) {
    c.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
  }
  c.lineTo(pts[n - 1][0], pts[n - 1][1]);
}
function inkWidths(it) {
  const P = it.pts, n = P.length, raw = new Array(n);
  for (let i = 0; i < n; i++) raw[i] = it.size * (0.12 + 1.1 * P[i][2]) / 2;
  const w = raw.slice();
  for (let i = 1; i < n - 1; i++) w[i] = (raw[i - 1] + raw[i] * 2 + raw[i + 1]) / 4;
  const T = Math.min(6, Math.floor(n / 3));
  for (let i = 0; i < T; i++) { const f = 0.4 + 0.6 * (i / T); w[i] *= f; w[n - 1 - i] *= 0.5 + 0.5 * (i / T); }
  return w;
}
function drawInk(c, it) {
  const P = it.pts, n = P.length; const ws = inkWidths(it);
  c.fillStyle = it.color; c.beginPath();
  if (n < 2) { c.arc(P[0][0], P[0][1], Math.max(0.6, it.size * 0.4), 0, Math.PI * 2); c.fill(); return; }
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len, w = Math.max(0.3, ws[i]);
    L.push([P[i][0] + nx * w, P[i][1] + ny * w]); R.push([P[i][0] - nx * w, P[i][1] - ny * w]);
  }
  tracePath(c, L, false);
  const e = P[n - 1], ae = Math.atan2(L[n - 1][1] - e[1], L[n - 1][0] - e[0]);
  c.arc(e[0], e[1], Math.max(0.3, ws[n - 1]), ae, ae - Math.PI, true);
  tracePath(c, R.reverse(), true);
  const s = P[0], as = Math.atan2(R[n - 1][1] - s[1], R[n - 1][0] - s[0]);
  c.arc(s[0], s[1], Math.max(0.3, ws[0]), as, as - Math.PI, true);
  c.closePath(); c.fill();
}
function drawStroke(c, it) {
  const P = it.pts; if (!P.length) return;
  c.save();
  if (it.tool === 'marker') { c.globalAlpha = 0.42; c.globalCompositeOperation = 'multiply'; }
  if (it.style === 'even' || it.tool === 'marker') {
    c.strokeStyle = it.color; c.lineWidth = it.size; c.lineCap = 'round'; c.lineJoin = 'round';
    c.beginPath(); tracePath(c, P, false); if (P.length === 1) c.lineTo(P[0][0] + 0.01, P[0][1]); c.stroke();
  } else drawInk(c, it);
  c.restore();
}
function shapePath(c, it) {
  const { x1, y1, x2, y2 } = it; const x0 = Math.min(x1, x2), y0 = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  c.beginPath();
  switch (it.kind) {
    case 'line': c.moveTo(x1, y1); c.lineTo(x2, y2); break;
    case 'arrow': {
      c.moveTo(x1, y1); c.lineTo(x2, y2);
      const a = Math.atan2(y2 - y1, x2 - x1), hl = arrowHead(it);
      c.moveTo(x2 - hl * Math.cos(a - 0.45), y2 - hl * Math.sin(a - 0.45)); c.lineTo(x2, y2);
      c.lineTo(x2 - hl * Math.cos(a + 0.45), y2 - hl * Math.sin(a + 0.45)); break;
    }
    case 'rect': c.rect(x0, y0, w, h); break;
    case 'ellipse': c.ellipse(x0 + w / 2, y0 + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); break;
    case 'triangle': c.moveTo(x0 + w / 2, y0); c.lineTo(x0 + w, y0 + h); c.lineTo(x0, y0 + h); c.closePath(); break;
  }
}
function drawShape(c, it) {
  c.save(); c.strokeStyle = it.color; c.lineWidth = it.size; c.lineCap = 'round'; c.lineJoin = 'round';
  shapePath(c, it); c.stroke(); c.restore();
}
function drawText(c, it) {
  c.save(); c.fillStyle = it.color; c.font = fontStr(it.fs); c.textBaseline = 'top';
  it.text.split('\n').forEach((l, i) => c.fillText(l, it.x, it.y + i * it.fs * 1.3 + it.fs * 0.08));
  c.restore();
}
function drawImageItem(c, it) {
  const im = getImg(it.src);
  if (im) c.drawImage(im, it.x, it.y, it.w, it.h);
  else { c.fillStyle = '#EFE6D8'; c.fillRect(it.x, it.y, it.w, it.h); }
}
function drawItem(c, it) {
  if (it === E.editing) return;
  if (it.type === 'stroke') drawStroke(c, it);
  else if (it.type === 'shape') drawShape(c, it);
  else if (it.type === 'text') drawText(c, it);
  else if (it.type === 'image') drawImageItem(c, it);
}

/* ---- Nền ---- */
function drawBg(c, w, h, view, type) {
  if (type === 'plain') return;
  const s = view.s, mod = (a, b) => ((a % b) + b) % b;
  const light = 'rgba(140,105,60,0.13)', strong = 'rgba(140,105,60,0.27)';
  c.save(); c.lineWidth = 1;
  const hl = (st, col, off) => { c.strokeStyle = col; c.beginPath(); for (let y = mod(off, st); y < h; y += st) { const yy = Math.round(y) + 0.5; c.moveTo(0, yy); c.lineTo(w, yy); } c.stroke(); };
  const vl = (st, col, off) => { c.strokeStyle = col; c.beginPath(); for (let x = mod(off, st); x < w; x += st) { const xx = Math.round(x) + 0.5; c.moveTo(xx, 0); c.lineTo(xx, h); } c.stroke(); };
  if (type === 'grid') { let st = 32 * s; while (st < 10) st *= 2; hl(st, light, view.y); vl(st, light, view.x); }
  else if (type === 'lines') {
    let st = 36 * s; while (st < 10) st *= 2; hl(st, light, view.y);
    const mx = view.x + 64 * s; if (mx > 0 && mx < w) { c.strokeStyle = 'rgba(196,92,80,0.28)'; c.beginPath(); c.moveTo(mx, 0); c.lineTo(mx, h); c.stroke(); }
  } else if (type === 'dots') {
    let st = 28 * s; while (st < 10) st *= 2; const r = clamp(1.4 * s, 0.9, 2);
    c.fillStyle = 'rgba(140,105,60,0.38)'; c.beginPath();
    for (let x = mod(view.x, st); x < w; x += st) for (let y = mod(view.y, st); y < h; y += st) c.rect(x - r / 2, y - r / 2, r, r);
    c.fill();
  } else if (type === 'oli') {
    const big = 48 * s;
    if (big >= 6) { if (big / 4 >= 4) hl(big / 4, light, view.y); hl(big, strong, view.y); vl(big, strong, view.x); }
  }
  c.restore();
}

/* ---- Vẽ cả cảnh ---- */
function drawScene(c, w, h, view, k, opts = {}) {
  c.setTransform(k, 0, 0, k, 0, 0);
  c.fillStyle = PAPER; c.fillRect(0, 0, w, h);
  drawBg(c, w, h, view, opts.bg || E.bg);
  c.setTransform(k * view.s, 0, 0, k * view.s, k * view.x, k * view.y);
  const vx = -view.x / view.s, vy = -view.y / view.s, vw = w / view.s, vh = h / view.s;
  for (const it of (opts.items || E.items)) {
    const b = bbox(it);
    if (b.x > vx + vw || b.y > vy + vh || b.x + b.w < vx || b.y + b.h < vy) continue;
    drawItem(c, it);
  }
}

function frame() {
  rafId = 0;
  if (baseDirty) { drawScene(bctx, W, H, E.view, DPR); baseDirty = false; }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(base, 0, 0);
  const s = E.view.s;
  ctx.setTransform(DPR * s, 0, 0, DPR * s, DPR * E.view.x, DPR * E.view.y);
  if (E.cur) drawItem(ctx, E.cur);
  // Vùng chọn
  if (E.sel.size) {
    const b = selBounds(); const pd = 6 / s;
    ctx.save(); ctx.strokeStyle = '#A86B3C'; ctx.lineWidth = 1.5 / s; ctx.setLineDash([6 / s, 4 / s]);
    ctx.strokeRect(b.x - pd, b.y - pd, b.w + 2 * pd, b.h + 2 * pd); ctx.setLineDash([]);
    const hs = 12 / s; ctx.fillStyle = '#fff'; ctx.lineWidth = 2 / s;
    ctx.fillRect(b.x + b.w + pd - hs / 2, b.y + b.h + pd - hs / 2, hs, hs); ctx.strokeRect(b.x + b.w + pd - hs / 2, b.y + b.h + pd - hs / 2, hs, hs);
    ctx.restore();
  }
  // Đường khoanh
  if (E.drag && E.drag.mode === 'lasso' && E.drag.pts.length > 1) {
    const erase = E.lassoMode === 'erase';
    ctx.save(); ctx.beginPath(); E.drag.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = erase ? 'rgba(181,71,58,0.08)' : 'rgba(168,107,60,0.07)'; ctx.fill();
    ctx.strokeStyle = erase ? '#B5473A' : '#A86B3C'; ctx.lineWidth = 1.5 / s; ctx.setLineDash([5 / s, 4 / s]); ctx.stroke(); ctx.restore();
  }
  // Laser
  const now = performance.now();
  E.laser = E.laser.filter(p => now - p.t < 900);
  if (E.laser.length) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < E.laser.length; i++) {
      const a = E.laser[i - 1], b = E.laser[i]; if (b.t - a.t > 120) continue;
      const life = 1 - (now - b.t) / 900;
      ctx.strokeStyle = `rgba(232,62,48,${0.85 * life})`; ctx.lineWidth = (3 + 4 * life) / s;
      ctx.shadowColor = 'rgba(255,80,60,0.8)'; ctx.shadowBlur = 10 * life;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();
  }
  // Con trỏ tẩy / laser
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (E.hover && !(E.drag && E.drag.mode === 'pan')) {
    if (E.tool === 'eraser') {
      ctx.beginPath(); ctx.arc(E.hover.x, E.hover.y, E.sizes.eraser / 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill(); ctx.strokeStyle = 'rgba(90,70,50,0.6)'; ctx.lineWidth = 1.2; ctx.stroke();
    } else if (E.tool === 'laser') {
      ctx.beginPath(); ctx.arc(E.hover.x, E.hover.y, 5, 0, Math.PI * 2); ctx.fillStyle = '#E83E30';
      ctx.shadowColor = 'rgba(255,60,40,.9)'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
    }
  }
  updateSelBar();
  if (E.laser.length) requestRender();
}

/* ---- Hình học ---- */
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function polyHit(pts, x, y, r) {
  if (pts.length === 1) return Math.hypot(pts[0][0] - x, pts[0][1] - y) <= r;
  for (let i = 0; i < pts.length - 1; i++) if (distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]) <= r) return true;
  return false;
}
function shapeOutline(it) {
  const { x1, y1, x2, y2 } = it; const x0 = Math.min(x1, x2), y0 = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
  switch (it.kind) {
    case 'line': case 'arrow': return [[x1, y1], [x2, y2]];
    case 'rect': return [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];
    case 'triangle': return [[x0 + w / 2, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0 + w / 2, y0]];
    default: { const o = []; for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2; o.push([x0 + w / 2 + Math.cos(a) * w / 2, y0 + h / 2 + Math.sin(a) * h / 2]); } return o; }
  }
}
function hitItem(it, x, y, tol) {
  const b = bbox(it);
  if (x < b.x - tol || x > b.x + b.w + tol || y < b.y - tol || y > b.y + b.h + tol) return false;
  if (it.type === 'stroke') return polyHit(it.pts, x, y, tol + it.size / 2);
  if (it.type === 'shape') return polyHit(shapeOutline(it), x, y, tol + it.size / 2);
  return true;
}
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}
function densify(pts, step) {
  if (pts.length < 2) return pts.slice();
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.floor(d / step);
    for (let k = 1; k <= n; k++) { const t = k / (n + 1); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]); }
    out.push(b);
  }
  return out;
}
function splitRuns(pts, removeFn) {
  const runs = []; let run = [];
  for (const q of pts) { if (removeFn(q)) { if (run.length) runs.push(run); run = []; } else run.push(q); }
  if (run.length) runs.push(run);
  return runs.filter(r => r.length >= 2);
}
function translateItem(it, dx, dy) {
  switch (it.type) {
    case 'stroke': return { ...it, pts: it.pts.map(p => [p[0] + dx, p[1] + dy, p[2]]) };
    case 'shape': return { ...it, x1: it.x1 + dx, y1: it.y1 + dy, x2: it.x2 + dx, y2: it.y2 + dy };
    default: return { ...it, x: it.x + dx, y: it.y + dy };
  }
}
function scaleItem(it, ax, ay, k) {
  const fx = x => ax + (x - ax) * k, fy = y => ay + (y - ay) * k;
  switch (it.type) {
    case 'stroke': return { ...it, size: it.size * k, pts: it.pts.map(p => [fx(p[0]), fy(p[1]), p[2]]) };
    case 'shape': return { ...it, size: it.size * k, x1: fx(it.x1), y1: fy(it.y1), x2: fx(it.x2), y2: fy(it.y2) };
    case 'text': return { ...it, x: fx(it.x), y: fy(it.y), fs: it.fs * k };
    default: return { ...it, x: fx(it.x), y: fy(it.y), w: it.w * k, h: it.h * k };
  }
}
const selBounds = () => unionBounds([...E.sel]);

/* ---- Lịch sử (hoàn tác) ---- */
function pushUndo(prev = E.items) { E.undo.push(prev); if (E.undo.length > 150) E.undo.shift(); E.redo = []; updateUndoBtns(); }
function setItems(arr) { E.items = arr; requestRender(true); scheduleSave(true); }
function commitItems(arr) { pushUndo(); setItems(arr); }
function undo() {
  commitTextEdit(); if (!E.undo.length) return;
  E.redo.push(E.items); E.items = E.undo.pop(); E.sel.clear(); requestRender(true); scheduleSave(true); updateUndoBtns();
}
function redo() {
  if (!E.redo.length) return;
  E.undo.push(E.items); E.items = E.redo.pop(); E.sel.clear(); requestRender(true); scheduleSave(true); updateUndoBtns();
}
function updateUndoBtns() {
  const u = $('#toolbar [data-act=undo]'), r = $('#toolbar [data-act=redo]');
  if (u) u.disabled = !E.undo.length; if (r) r.disabled = !E.redo.length;
}

/* ---- Thu phóng ---- */
function zoomAt(px, py, factor) {
  const s0 = E.view.s, s1 = clamp(s0 * factor, 0.1, 8);
  E.view.x = px - (px - E.view.x) * (s1 / s0); E.view.y = py - (py - E.view.y) * (s1 / s0); E.view.s = s1;
  requestRender(true); updateZoomLabel(); scheduleSave(false);
}
function fitView(b, w, h, margin, maxS = 2) {
  const s = Math.min((w - 2 * margin) / Math.max(b.w, 1), (h - 2 * margin) / Math.max(b.h, 1), maxS);
  return { s, x: w / 2 - (b.x + b.w / 2) * s, y: h / 2 - (b.y + b.h / 2) * s };
}
function fitContent() {
  const b = unionBounds(E.items);
  E.view = b ? fitView(b, W, H - 80, 60, 1.5) : { x: 0, y: 0, s: 1 };
  requestRender(true); updateZoomLabel(); scheduleSave(false);
}
function updateZoomLabel() { const z = $('#zoombar .zl'); if (z) z.textContent = Math.round(E.view.s * 100) + '%'; }

/* =====================================================================
   Tương tác con trỏ / bút
   ===================================================================== */
const touches = new Map();
let pinch = null, spaceDown = false;

function curSizeWorld(kind) { return E.sizes[kind] / E.view.s; }

cv.addEventListener('pointerdown', e => {
  if (E.editing) { commitTextEdit(); if (E.tool === 'text') return; }
  closeMenu();
  if (innerWidth <= 900 && !$('#app').classList.contains('focus')) { $('#app').classList.add('focus'); return; }
  cv.setPointerCapture(e.pointerId);
  const p = pos(e);
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, p);
    if (touches.size === 2) { cancelDrag(); startPinch(); return; }
    if (touches.size > 2 || pinch) return;
    if (S.settings.penOnly) { E.drag = { mode: 'pan', id: e.pointerId, last: p }; return; }
  }
  if (E.drag) return;
  if (e.button === 1 || e.button === 2 || spaceDown || E.tool === 'hand') {
    E.drag = { mode: 'pan', id: e.pointerId, last: p }; cv.classList.add('panning'); return;
  }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const w = toWorld(p);
  switch (E.tool) {
    case 'pen': case 'marker': startStroke(e, p); break;
    case 'eraser': E.drag = { mode: 'erase', id: e.pointerId, last: w, before: E.items, changed: false }; eraseAt(w); requestRender(true); break;
    case 'lasso': lassoDown(e, p, w); break;
    case 'shape':
      E.cur = { type: 'shape', kind: E.shape, color: E.color, size: curSizeWorld('shape'), x1: r1(w.x), y1: r1(w.y), x2: r1(w.x), y2: r1(w.y) };
      E.drag = { mode: 'shape', id: e.pointerId }; break;
    case 'text': startTextEdit(null, w); break;
    case 'laser': E.drag = { mode: 'laser', id: e.pointerId }; E.laser.push({ ...w, t: performance.now() }); requestRender(); break;
  }
});

cv.addEventListener('pointermove', e => {
  const p = pos(e);
  E.hover = e.pointerType === 'touch' ? null : p;
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, p);
    if (pinch) { if (!pinch.ended) updatePinch(); return; }
  }
  const d = E.drag;
  if (!d) { if (E.tool === 'eraser' || E.tool === 'laser') requestRender(); updateHoverCursor(p); return; }
  if (d.id !== e.pointerId) return;
  switch (d.mode) {
    case 'pan': E.view.x += p.x - d.last.x; E.view.y += p.y - d.last.y; d.last = p; requestRender(true); break;
    case 'stroke': { const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : []; (evs.length ? evs : [e]).forEach(addPoint); requestRender(); break; }
    case 'erase': { const w = toWorld(p); eraseSeg(d.last, w); d.last = w; requestRender(true); break; }
    case 'lasso': { const w = toWorld(p); d.pts.push([w.x, w.y]); requestRender(); break; }
    case 'move': {
      const w = toWorld(p); const dx = w.x - d.start.x, dy = w.y - d.start.y; d.moved = d.moved || Math.hypot(dx, dy) * E.view.s > 2;
      d.idx.forEach((i, j) => { E.items[i] = translateItem(d.orig[j], dx, dy); });
      E.sel = new Set(d.idx.map(i => E.items[i])); requestRender(true); break;
    }
    case 'scale': {
      const w = toWorld(p); const b = d.box;
      const k = Math.max(0.05, ((w.x - b.x) + (w.y - b.y)) / (b.w + b.h)); d.moved = true;
      d.idx.forEach((i, j) => { E.items[i] = scaleItem(d.orig[j], b.x, b.y, k); });
      E.sel = new Set(d.idx.map(i => E.items[i])); requestRender(true); break;
    }
    case 'shape': {
      const w = toWorld(p); let x2 = w.x, y2 = w.y; const c = E.cur;
      if (e.shiftKey) {
        const dx = x2 - c.x1, dy = y2 - c.y1;
        if (c.kind === 'line' || c.kind === 'arrow') { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4), l = Math.hypot(dx, dy); x2 = c.x1 + Math.cos(a) * l; y2 = c.y1 + Math.sin(a) * l; }
        else { const m = Math.max(Math.abs(dx), Math.abs(dy)); x2 = c.x1 + Math.sign(dx || 1) * m; y2 = c.y1 + Math.sign(dy || 1) * m; }
      }
      c.x2 = r1(x2); c.y2 = r1(y2); requestRender(); break;
    }
    case 'laser': E.laser.push({ ...toWorld(p), t: performance.now() }); requestRender(); break;
  }
});

function endPointer(e) {
  if (e.pointerType === 'touch') {
    touches.delete(e.pointerId);
    if (pinch) { pinch.ended = true; if (!touches.size) { pinch = null; scheduleSave(false); } return; }
  }
  const d = E.drag; if (!d || d.id !== e.pointerId) return;
  E.drag = null; cv.classList.remove('panning');
  switch (d.mode) {
    case 'pan': scheduleSave(false); break;
    case 'stroke':
      if (E.cur && E.cur.pts.length) {
        const w = toWorld(pos(e)), l = E.cur.pts[E.cur.pts.length - 1];
        if (Math.hypot(w.x - l[0], w.y - l[1]) * E.view.s > 1) E.cur.pts.push([r1(w.x), r1(w.y), l[2]]);
        commitItems([...E.items, E.cur]);
      }
      E.cur = null; break;
    case 'erase': if (d.changed) { pushUndo(d.before); scheduleSave(true); } break;
    case 'lasso': lassoUp(d); break;
    case 'move': case 'scale':
      if (!d.moved) { E.items = E.undo.pop(); E.sel = new Set(d.idx.map(i => E.items[i])); updateUndoBtns(); }
      else scheduleSave(true);
      requestRender(true); break;
    case 'shape': {
      const c = E.cur; E.cur = null;
      if (Math.hypot(c.x2 - c.x1, c.y2 - c.y1) * E.view.s > 3) commitItems([...E.items, c]); else requestRender();
      break;
    }
  }
  requestRender();
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('pointerleave', () => { E.hover = null; requestRender(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => e.preventDefault()); // giữ con trỏ trong ô chữ đang gõ
cv.addEventListener('wheel', e => {
  e.preventDefault(); const p = pos(e);
  if (e.ctrlKey || e.metaKey) zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.01)));
  else { E.view.x -= e.deltaX; E.view.y -= e.deltaY; requestRender(true); scheduleSave(false); }
}, { passive: false });
cv.addEventListener('dblclick', e => {
  const w = toWorld(pos(e));
  const t = [...E.items].reverse().find(it => it.type === 'text' && hitItem(it, w.x, w.y, 4 / E.view.s));
  if (t) startTextEdit(t);
});

function startPinch() {
  const [a, b] = [...touches.values()];
  pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, v: { ...E.view } };
}
function updatePinch() {
  const [a, b] = [...touches.values()]; if (!b) return;
  const d = Math.hypot(a.x - b.x, a.y - b.y), c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const s1 = clamp(pinch.v.s * d / pinch.d, 0.1, 8), k = s1 / pinch.v.s;
  E.view = { s: s1, x: c.x - (pinch.c.x - pinch.v.x) * k, y: c.y - (pinch.c.y - pinch.v.y) * k };
  requestRender(true); updateZoomLabel();
}
function cancelDrag() {
  const d = E.drag; if (!d) return;
  if (d.mode === 'stroke' || d.mode === 'shape') E.cur = null;
  else if (d.mode === 'erase' && d.changed) E.items = d.before;
  else if ((d.mode === 'move' || d.mode === 'scale')) { E.items = E.undo.pop(); E.sel.clear(); updateUndoBtns(); }
  E.drag = null; requestRender(true);
}
function updateHoverCursor(p) {
  if (E.tool !== 'lasso' || !E.sel.size) { if (cv.style.cursor) cv.style.cursor = ''; return; }
  const b = selBounds(), pd = 6 / E.view.s, w = toWorld(p);
  const hs = toScreen(b.x + b.w + pd, b.y + b.h + pd);
  if (Math.hypot(p.x - hs.x, p.y - hs.y) < 14) cv.style.cursor = 'nwse-resize';
  else if (w.x >= b.x - pd && w.x <= b.x + b.w + pd && w.y >= b.y - pd && w.y <= b.y + b.h + pd) cv.style.cursor = 'move';
  else cv.style.cursor = '';
}

/* ---- Bút ---- */
function startStroke(e, p) {
  const marker = E.tool === 'marker';
  E.cur = { type: 'stroke', tool: E.tool, style: marker ? 'even' : E.penStyle, color: marker ? E.markerColor : E.color, size: curSizeWorld(marker ? 'marker' : 'pen'), pts: [] };
  E.drag = { mode: 'stroke', id: e.pointerId, lastP: p, lastT: e.timeStamp, pv: 0.7, pen: e.pointerType === 'pen' };
  addPoint(e);
}
function addPoint(ev) {
  const d = E.drag, p = pos(ev), w = toWorld(p), P = E.cur.pts;
  let pr;
  if (d.pen && ev.pressure > 0) pr = ev.pressure;
  else {
    const dist = Math.hypot(p.x - d.lastP.x, p.y - d.lastP.y), dt = Math.max(1, ev.timeStamp - d.lastT);
    const target = clamp(1.2 - (dist / dt) * 0.55, 0.15, 1);
    d.pv = P.length ? d.pv * 0.7 + target * 0.3 : 0.75; pr = d.pv;
  }
  if (P.length) {
    const l = P[P.length - 1];
    if (Math.hypot(w.x - l[0], w.y - l[1]) * E.view.s < 1.2) return;
    const k = d.pen ? 0.75 : 0.55; w.x = l[0] + (w.x - l[0]) * k; w.y = l[1] + (w.y - l[1]) * k;
  }
  P.push([r1(w.x), r1(w.y), Math.round(pr * 100) / 100]);
  d.lastP = p; d.lastT = ev.timeStamp;
}

/* ---- Tẩy ---- */
function eraseSeg(a, b) {
  const r = curSizeWorld('eraser') / 2, dist = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(1, Math.ceil(dist / (r * 0.5)));
  for (let i = 1; i <= n; i++) eraseAt({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
}
function eraseAt(pt) {
  const r = curSizeWorld('eraser') / 2; let changed = false; const out = [];
  for (const it of E.items) {
    const bb = bbox(it);
    if (pt.x < bb.x - r || pt.x > bb.x + bb.w + r || pt.y < bb.y - r || pt.y > bb.y + bb.h + r || it.type === 'image') { out.push(it); continue; }
    if (it.type === 'stroke') {
      const rr = r + it.size * 0.35;
      if (!polyHit(it.pts, pt.x, pt.y, rr)) { out.push(it); continue; }
      changed = true;
      if (E.eraserMode === 'stroke') continue;
      const dense = densify(it.pts, Math.max(0.5, r / 3));
      splitRuns(dense, q => Math.hypot(q[0] - pt.x, q[1] - pt.y) <= rr).forEach(run => out.push({ ...it, pts: run }));
    } else if (hitItem(it, pt.x, pt.y, r)) changed = true;
    else out.push(it);
  }
  if (changed) { E.items = out; E.drag.changed = true; }
}

/* ---- Khoanh vùng ---- */
function lassoDown(e, p, w) {
  if (E.sel.size) {
    const b = selBounds(), pd = 6 / E.view.s;
    const hs = toScreen(b.x + b.w + pd, b.y + b.h + pd);
    const inside = w.x >= b.x - pd && w.x <= b.x + b.w + pd && w.y >= b.y - pd && w.y <= b.y + b.h + pd;
    const onHandle = Math.hypot(p.x - hs.x, p.y - hs.y) < 14;
    if (onHandle || inside) {
      pushUndo(); E.items = E.items.slice();
      const idx = []; E.items.forEach((it, i) => { if (E.sel.has(it)) idx.push(i); });
      E.drag = { mode: onHandle ? 'scale' : 'move', id: e.pointerId, start: w, idx, orig: idx.map(i => E.items[i]), box: b, moved: false };
      return;
    }
  }
  E.sel.clear();
  E.drag = { mode: 'lasso', id: e.pointerId, pts: [[w.x, w.y]] };
  requestRender();
}
function lassoUp(d) {
  const poly = d.pts; const b = unionBounds([{ type: 'stroke', size: 0, pts: poly.map(q => [q[0], q[1], 0]) }]);
  const tiny = !b || (b.w * E.view.s < 6 && b.h * E.view.s < 6);
  if (tiny) {
    const [x, y] = poly[0];
    const hit = [...E.items].reverse().find(it => hitItem(it, x, y, 6 / E.view.s));
    if (hit) E.sel = new Set([hit]);
    requestRender(); return;
  }
  if (E.lassoMode === 'select') {
    const inside = it => {
      if (it.type === 'stroke') { let c = 0; for (const q of it.pts) if (pointInPoly(q[0], q[1], poly)) c++; return c >= it.pts.length * 0.5; }
      const bb = bbox(it); return pointInPoly(bb.x + bb.w / 2, bb.y + bb.h / 2, poly);
    };
    E.sel = new Set(E.items.filter(inside));
    if (!E.sel.size) toast('Không có nét nào trong vùng khoanh');
  } else {
    let changed = false; const out = [];
    for (const it of E.items) {
      const bb = bbox(it);
      if (bb.x + bb.w < b.x || bb.x > b.x + b.w || bb.y + bb.h < b.y || bb.y > b.y + b.h) { out.push(it); continue; }
      if (it.type === 'stroke') {
        if (!it.pts.some(q => pointInPoly(q[0], q[1], poly)) && !(it.pts.length > 1)) { out.push(it); continue; }
        const dense = densify(it.pts, Math.max(0.5, 2 / E.view.s));
        const runs = splitRuns(dense, q => pointInPoly(q[0], q[1], poly));
        const removed = runs.reduce((a, r) => a + r.length, 0) !== dense.length;
        if (!removed) { out.push(it); continue; }
        changed = true; runs.forEach(run => out.push({ ...it, pts: run }));
      } else if (pointInPoly(bb.x + bb.w / 2, bb.y + bb.h / 2, poly)) changed = true;
      else out.push(it);
    }
    if (changed) commitItems(out);
  }
  requestRender(true);
}

/* ---- Thao tác với vùng chọn ---- */
function deleteSelection() { if (!E.sel.size) return; commitItems(E.items.filter(i => !E.sel.has(i))); E.sel.clear(); }
function duplicateSelection() {
  if (!E.sel.size) return; const off = 24 / E.view.s;
  const copies = E.items.filter(i => E.sel.has(i)).map(i => translateItem(i, off, off));
  commitItems([...E.items, ...copies]); E.sel = new Set(copies);
}
function recolorSelection() {
  if (!E.sel.size) return; const next = [];
  const items = E.items.map(it => {
    if (!E.sel.has(it) || it.type === 'image') { if (E.sel.has(it)) next.push(it); return it; }
    const n = { ...it, color: it.tool === 'marker' ? E.markerColor : E.color }; next.push(n); return n;
  });
  commitItems(items); E.sel = new Set(next);
}
function reorderSelection(front) {
  if (!E.sel.size) return; const sel = E.items.filter(i => E.sel.has(i)), rest = E.items.filter(i => !E.sel.has(i));
  commitItems(front ? [...rest, ...sel] : [...sel, ...rest]);
}
function selectAll() { setTool('lasso'); E.sel = new Set(E.items); requestRender(); }

const selbar = $('#selbar');
function renderSelbar() {
  selbar.innerHTML = `
    <button class="icon-btn danger" data-s="del" title="Xoá (Delete)">${ic('trash', 18)}</button>
    <button class="icon-btn" data-s="dup" title="Nhân bản (Ctrl+D)">${ic('copy', 18)}</button>
    <button class="icon-btn" data-s="color" title="Đổi sang màu đang chọn"><span class="cdot" style="background:${E.color}"></span></button>
    <button class="icon-btn" data-s="front" title="Đưa lên trên">${ic('up', 18)}</button>
    <button class="icon-btn" data-s="back" title="Đưa xuống dưới">${ic('down', 18)}</button>`;
}
selbar.addEventListener('click', e => {
  const b = e.target.closest('[data-s]'); if (!b) return;
  ({ del: deleteSelection, dup: duplicateSelection, color: recolorSelection, front: () => reorderSelection(true), back: () => reorderSelection(false) })[b.dataset.s]();
});
function updateSelBar() {
  if (!E.sel.size || E.drag) { selbar.classList.add('hidden'); return; }
  const b = selBounds(); if (!b) { selbar.classList.add('hidden'); return; }
  selbar.classList.remove('hidden');
  const tl = toScreen(b.x, b.y), br = toScreen(b.x + b.w, b.y + b.h);
  const w = selbar.offsetWidth || 180;
  let top = tl.y - 58; if (top < 8) top = Math.min(br.y + 16, H - 60);
  selbar.style.left = clamp((tl.x + br.x) / 2 - w / 2, 8, W - w - 8) + 'px';
  selbar.style.top = top + 'px';
}

/* ---- Chữ ---- */
let textEl = null;
function startTextEdit(item, w) {
  commitTextEdit();
  const fs = item ? item.fs : curSizeWorld('text');
  const x = item ? item.x : w.x, y = item ? item.y : w.y - fs * 0.6;
  const color = item ? item.color : E.color;
  E.editing = item; requestRender(true);
  const ta = document.createElement('textarea'); ta.className = 'text-editor';
  ta.value = item ? item.text : '';
  ta.style.color = color; ta.spellcheck = false;
  const place = () => {
    const sp = toScreen(x, y), px = fs * E.view.s;
    ta.style.left = sp.x - 3 + 'px'; ta.style.top = sp.y - 3 + 'px'; ta.style.fontSize = px + 'px';
    ta.style.padding = '2px'; ta.style.height = 'auto'; ta.style.width = 'auto';
    ta.style.height = ta.scrollHeight + 4 + 'px'; ta.style.width = Math.max(60, ta.scrollWidth + px) + 'px';
  };
  ta.addEventListener('input', place);
  ta.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Escape' || (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey))) { ev.preventDefault(); commitTextEdit(); }
  });
  ta.addEventListener('blur', () => setTimeout(commitTextEdit, 0));
  wrap.append(ta); textEl = { ta, item, x, y, fs, color }; place();
  const focus = () => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); };
  focus(); setTimeout(focus, 0);
}
function commitTextEdit() {
  if (!textEl) return; const { ta, item, x, y, fs, color } = textEl; textEl = null;
  const text = ta.value.replace(/\s+$/, ''); ta.remove(); E.editing = null;
  if (item) {
    if (!text) commitItems(E.items.filter(i => i !== item));
    else if (text !== item.text) commitItems(E.items.map(i => i === item ? { ...item, text } : i));
  } else if (text) commitItems([...E.items, { type: 'text', x: r1(x), y: r1(y), fs, color, text }]);
  requestRender(true);
}

/* ---- Chèn ảnh & PDF ---- */
async function prepareImageSrc(blob) {
  const src = await blobToDataURL(blob); const img = await loadImg(src);
  const max = 2400, big = Math.max(img.naturalWidth, img.naturalHeight);
  if (big <= max && blob.size < 2.5e6) return { src, w: img.naturalWidth, h: img.naturalHeight };
  const k = Math.min(1, max / big), c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
  const g = c.getContext('2d'); const png = blob.type === 'image/png';
  if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
  g.drawImage(img, 0, 0, c.width, c.height);
  return { src: c.toDataURL(png ? 'image/png' : 'image/jpeg', 0.88), w: c.width, h: c.height };
}
function viewportWorld() { return { x: -E.view.x / E.view.s, y: -E.view.y / E.view.s, w: W / E.view.s, h: H / E.view.s }; }
function placeItems(items) {
  commitItems([...E.items, ...items]); setTool('lasso'); E.sel = new Set(items); requestRender(true);
  toast('Kéo để di chuyển · kéo ô vuông ở góc để phóng to/thu nhỏ');
}
async function insertImageBlob(blob) {
  try {
    const { src, w, h } = await prepareImageSrc(blob); const v = viewportWorld();
    const k = Math.min((v.w * 0.6) / w, (v.h * 0.7) / h, 1 / E.view.s * 1.5);
    const iw = w * k, ih = h * k;
    placeItems([{ type: 'image', x: r1(v.x + (v.w - iw) / 2), y: r1(v.y + (v.h - ih) / 2), w: r1(iw), h: r1(ih), src }]);
  } catch (err) { toast('Không đọc được ảnh này', true); }
}
async function loadPdfJs() {
  if (window.pdfjsLib) return;
  let dir = 'vendor/';
  try { await loadScript(dir + 'pdf.min.js'); }
  catch (e) { dir = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/'; await loadScript(dir + 'pdf.min.js'); }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = dir + 'pdf.worker.min.js';
}
async function insertPdfBlob(blob) {
  try {
    toast('Đang mở PDF…');
    await loadPdfJs();
    const pdf = await window.pdfjsLib.getDocument({ data: await blob.arrayBuffer() }).promise;
    let from = 1, to = pdf.numPages;
    if (pdf.numPages > 1) {
      const r = await formBox('Chèn PDF lên bảng', [
        { name: 'from', label: 'Từ trang', type: 'number', value: 1, min: 1, max: pdf.numPages },
        { name: 'to', label: `Đến trang (tổng ${pdf.numPages} trang)`, type: 'number', value: Math.min(pdf.numPages, 20), min: 1, max: pdf.numPages },
      ], 'Chèn', `<p class="muted">Mỗi trang sẽ thành một ảnh trên bảng, xếp từ trên xuống. Bạn có thể viết đè lên.</p>`, true);
      if (!r) return;
      from = clamp(parseInt(r.from) || 1, 1, pdf.numPages); to = clamp(parseInt(r.to) || from, from, pdf.numPages);
    }
    const v = viewportWorld(); const pageW = Math.min(900, W * 0.72) / E.view.s;
    let y = v.y + 40 / E.view.s; const x = v.x + (v.w - pageW) / 2; const items = [];
    for (let i = from; i <= to; i++) {
      const page = await pdf.getPage(i); const vp1 = page.getViewport({ scale: 1 });
      const scale = Math.min(2.4, 1700 / vp1.width); const vp = page.getViewport({ scale });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: g, viewport: vp }).promise;
      const h = pageW * vp1.height / vp1.width;
      items.push({ type: 'image', x: r1(x), y: r1(y), w: r1(pageW), h: r1(h), src: c.toDataURL('image/jpeg', 0.86) });
      y += h + 28 / E.view.s;
      if (to - from > 2) toast(`Đang xử lý trang ${i}/${to}…`);
    }
    placeItems(items);
  } catch (err) { console.error(err); toast('Không mở được tệp PDF này', true); }
}
async function insertBlob(blob, name = '') {
  const t = blob.type || '';
  if (t.startsWith('image/')) return insertImageBlob(blob);
  if (t === 'application/pdf' || /\.pdf$/i.test(name)) return insertPdfBlob(blob);
  toast('Chỉ đưa được ảnh hoặc PDF lên bảng. Với Word/PowerPoint, hãy lưu sang PDF trước.', true);
}

/* ---- Ảnh xuất / ảnh thu nhỏ ---- */
function makeThumb() {
  const b = unionBounds(E.items); if (!b) return null;
  const c = document.createElement('canvas'); c.width = 192; c.height = 132; const g = c.getContext('2d');
  drawScene(g, 192, 132, fitView(b, 192, 132, 8, 1), 1);
  return c.toDataURL('image/jpeg', 0.72);
}
function renderBoardPNG() {
  const b = unionBounds(E.items); if (!b) return null;
  const m = 40; let k = 2; const w = b.w + 2 * m, h = b.h + 2 * m;
  k = Math.min(k, 8000 / w, 8000 / h);
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  drawScene(c.getContext('2d'), w, h, { s: 1, x: -b.x + m, y: -b.y + m }, k);
  return new Promise(res => c.toBlob(res, 'image/png'));
}

/* =====================================================================
   Thanh công cụ
   ===================================================================== */
function buildToolbar() {
  const tb = $('#toolbar');
  tb.innerHTML = TOOLS.map(([id, icon, label]) => `<button class="tool" data-tool="${id}" title="${label}">${ic(icon, 21)}${id === 'pen' || id === 'marker' ? '<span class="swatch-mini"></span>' : ''}</button>`).join('')
    + `<span class="tsep"></span>
       <button class="tool" data-act="undo" title="Hoàn tác (Ctrl+Z)">${ic('undo', 21)}</button>
       <button class="tool" data-act="redo" title="Làm lại (Ctrl+Shift+Z)">${ic('redo', 21)}</button>
       <span class="tsep"></span>
       <button class="tool" data-act="insert" title="Chèn ảnh / PDF (I) — hoặc kéo thả, dán Ctrl+V">${ic('image', 21)}</button>
       <button class="tool" data-act="clear" title="Xoá sạch bảng">${ic('wipe', 21)}</button>`;
  tb.addEventListener('click', e => {
    const t = e.target.closest('[data-tool]'); if (t) return setTool(t.dataset.tool);
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'undo') undo();
    else if (a.dataset.act === 'redo') redo();
    else if (a.dataset.act === 'insert') $('#fileInsert').click();
    else if (a.dataset.act === 'clear') clearBoard();
  });
  $('#zoombar').innerHTML = `
    <button class="icon-btn sm" data-z="out" title="Thu nhỏ (−)">${ic('minus', 17)}</button>
    <button class="zl" data-z="reset" title="Về 100% (0)">100%</button>
    <button class="icon-btn sm" data-z="in" title="Phóng to (+)">${ic('plus', 17)}</button>
    <button class="icon-btn sm" data-z="fit" title="Xem toàn bộ nội dung">${ic('fit', 17)}</button>`;
  $('#zoombar').addEventListener('click', e => {
    const z = e.target.closest('[data-z]')?.dataset.z; if (!z) return;
    if (z === 'in') zoomAt(W / 2, H / 2, 1.25); else if (z === 'out') zoomAt(W / 2, H / 2, 0.8);
    else if (z === 'reset') zoomAt(W / 2, H / 2, 1 / E.view.s); else fitContent();
  });
  updateUndoBtns();
}
async function clearBoard() {
  if (!E.items.length) return;
  if (await confirmBox('Xoá sạch bảng?', 'Mọi nét vẽ, chữ và tài liệu trên bảng này sẽ bị xoá. Bạn vẫn có thể bấm Hoàn tác (Ctrl+Z) ngay sau đó.', 'Xoá sạch')) {
    commitItems([]); E.sel.clear();
  }
}
function setTool(t) {
  commitTextEdit();
  if (t !== 'lasso') E.sel.clear();
  E.tool = t; savePrefs();
  $$('#toolbar [data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  cv.className = 't-' + t; cv.style.cursor = '';
  renderProps(); requestRender();
}
function swatchesHTML(list, cur, key) {
  const custom = !list.includes(cur);
  return `<div class="swatches">${list.map(c => `<button class="sw ${c === cur ? 'active' : ''}" style="background:${c}" data-color="${c}" data-key="${key}" title="${c}"></button>`).join('')}
    <label class="sw custom ${custom ? 'active' : ''}" title="Màu tuỳ chọn" ${custom ? `style="background:${cur}"` : ''}><input type="color" value="${cur}" data-key="${key}"></label></div>`;
}
function sizeHTML(kind) {
  const [mn, mx] = SIZE_RANGE[kind], v = E.sizes[kind];
  const d = kind === 'text' ? 0 : clamp(v, 2, 28);
  return `<div class="size-ctl" title="Độ dày ( [ và ] )">
    ${kind === 'text' ? `<span class="prop-hint">Cỡ chữ</span>` : `<span class="prev"><span style="width:${d}px;height:${d}px;background:${kind === 'eraser' ? '#CDBFA8' : (kind === 'marker' ? E.markerColor : E.color)}"></span></span>`}
    <input type="range" min="${mn}" max="${mx}" value="${v}" data-size="${kind}"><span class="val">${v}</span></div>`;
}
const segHTML = (key, opts, cur, icons) => `<div class="seg ${icons ? 'icons' : ''}">${opts.map(([v, l, i]) => `<button data-seg="${key}" data-v="${v}" class="${v === cur ? 'active' : ''}" title="${l}">${i ? ic(i, 18) : ''}${icons ? '' : l}</button>`).join('')}</div>`;
function renderProps() {
  const p = $('#props'); let h = '';
  switch (E.tool) {
    case 'pen': h = swatchesHTML(COLORS, E.color, 'color') + '<span class="psep"></span>' + sizeHTML('pen') + '<span class="psep"></span>' + segHTML('penStyle', [['ink', 'Thanh đậm'], ['even', 'Nét đều']], E.penStyle); break;
    case 'marker': h = swatchesHTML(MARKERS, E.markerColor, 'markerColor') + '<span class="psep"></span>' + sizeHTML('marker'); break;
    case 'eraser': h = segHTML('eraserMode', [['part', 'Tẩy từng phần'], ['stroke', 'Tẩy cả nét']], E.eraserMode) + '<span class="psep"></span>' + sizeHTML('eraser'); break;
    case 'lasso': h = segHTML('lassoMode', [['select', 'Khoanh để chọn'], ['erase', 'Khoanh để xoá']], E.lassoMode) + `<span class="prop-hint">${E.lassoMode === 'erase' ? 'Vẽ vòng quanh phần muốn xoá' : 'Khoanh rồi kéo để di chuyển · bấm vào ảnh để chọn'}</span>`; break;
    case 'shape': h = segHTML('shape', [['line', 'Đường thẳng', 's_line'], ['arrow', 'Mũi tên', 's_arrow'], ['rect', 'Hình chữ nhật', 's_rect'], ['ellipse', 'Hình tròn/elip', 's_ellipse'], ['triangle', 'Tam giác', 's_triangle']], E.shape, true) + '<span class="psep"></span>' + swatchesHTML(COLORS, E.color, 'color') + '<span class="psep"></span>' + sizeHTML('shape'); break;
    case 'text': h = swatchesHTML(COLORS, E.color, 'color') + '<span class="psep"></span>' + sizeHTML('text') + `<span class="prop-hint">Bấm vào bảng để gõ · nhấp đúp chữ để sửa</span>`; break;
    case 'laser': h = `<span class="prop-hint">Bút laser để chỉ cho học sinh — nét tự biến mất sau 1 giây</span>`; break;
    case 'hand': h = `<span class="prop-hint">Kéo để di chuyển bảng · Ctrl + cuộn (hoặc chụm 2 ngón) để phóng to</span>`; break;
  }
  p.innerHTML = h;
  $$('.tool .swatch-mini').forEach(s => { s.style.background = s.parentElement.dataset.tool === 'marker' ? E.markerColor : E.color; });
  renderSelbar();
}
$('#props').addEventListener('click', e => {
  const sw = e.target.closest('[data-color]');
  if (sw) { E[sw.dataset.key] = sw.dataset.color; savePrefs(); renderProps(); return; }
  const sg = e.target.closest('[data-seg]');
  if (sg) { E[sg.dataset.seg] = sg.dataset.v; savePrefs(); renderProps(); }
});
$('#props').addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.size) { E.sizes[t.dataset.size] = +t.value; t.nextElementSibling.textContent = t.value; const pv = t.parentElement.querySelector('.prev span'); if (pv) { const d = clamp(+t.value, 2, 28); pv.style.width = pv.style.height = d + 'px'; } savePrefs(); requestRender(); }
});
$('#props').addEventListener('change', e => {
  const t = e.target; if (t.type === 'color') { E[t.dataset.key] = t.value; savePrefs(); renderProps(); }
});

/* =====================================================================
   Lưu tự động
   ===================================================================== */
let saveTimer = null, contentDirty = false, viewDirty = false;
function scheduleSave(content) {
  if (!S.boardId) return;
  if (content) { contentDirty = true; setStatus(true); } else viewDirty = true;
  clearTimeout(saveTimer); saveTimer = setTimeout(doSave, content ? 700 : 1200);
}
async function doSave() {
  clearTimeout(saveTimer);
  if (!S.boardId || (!contentDirty && !viewDirty)) return;
  const id = S.boardId, content = contentDirty; contentDirty = viewDirty = false;
  try {
    await DB.put('boardData', { id, items: E.items, bg: E.bg, view: E.view });
    if (content) {
      const b = S.boards.find(x => x.id === id);
      if (b) {
        b.updatedAt = Date.now(); b.thumb = makeThumb(); await DB.put('boards', b);
        const card = $(`.board-card[data-board="${id}"]`);
        if (card) { $('.thumb', card).innerHTML = b.thumb ? `<img src="${b.thumb}" alt="">` : ''; $('.s', card).textContent = 'Sửa lúc ' + fmtTime(b.updatedAt); }
      }
    }
    setStatus(false);
  } catch (err) { console.error(err); toast('Không lưu được — bộ nhớ trình duyệt có thể đã đầy', true); }
}
function setStatus(saving) {
  const s = $('#saveStatus'); s.classList.toggle('saving', saving);
  s.innerHTML = `<span class="d"></span><span class="txt">${saving ? 'Đang lưu…' : 'Đã lưu'}</span>`;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) doSave(); });
window.addEventListener('beforeunload', () => { doSave(); });

/* =====================================================================
   Học sinh & bảng
   ===================================================================== */
async function createBoard(studentId, open = true) {
  const d = todayStr(); const n = S.boards.filter(b => b.studentId === studentId && b.date === d).length;
  const b = { id: uid(), studentId, title: `Buổi học ${shortDate(d)}${n ? ` (${n + 1})` : ''}`, date: d, createdAt: Date.now(), updatedAt: Date.now(), thumb: null };
  await DB.put('boards', b); await DB.put('boardData', { id: b.id, items: [], bg: E.bg || 'grid', view: { x: 0, y: 0, s: 1 } });
  S.boards.push(b);
  if (open) await openBoard(b.id);
  renderSidebar(); renderPanel();
  return b;
}
async function openBoard(id) {
  commitTextEdit(); await doSave();
  const b = S.boards.find(x => x.id === id); if (!b) return;
  const data = (await DB.get('boardData', id)) || { items: [], bg: 'grid', view: { x: 0, y: 0, s: 1 } };
  S.boardId = id; E.items = data.items || []; E.bg = data.bg || 'grid'; E.view = data.view || { x: 0, y: 0, s: 1 };
  E.undo = []; E.redo = []; E.sel.clear(); E.cur = null; E.drag = null; bbCache = new WeakMap();
  S.settings.lastBoard = id; S.settings.lastStudent = S.studentId; saveSettings();
  renderTopbar(); updateUndoBtns(); updateZoomLabel(); setStatus(false); requestRender(true);
  $$('.board-card').forEach(c => c.classList.toggle('active', c.dataset.board === id));
}
async function duplicateBoard(id) {
  await doSave();
  const src = S.boards.find(b => b.id === id); const data = await DB.get('boardData', id);
  const b = { ...src, id: uid(), title: src.title + ' (bản sao)', date: todayStr(), createdAt: Date.now(), updatedAt: Date.now() };
  await DB.put('boards', b); await DB.put('boardData', { ...data, id: b.id });
  S.boards.push(b); await openBoard(b.id); renderPanel(); renderSidebar(); toast('Đã nhân bản bảng');
}
async function deleteBoard(id) {
  const b = S.boards.find(x => x.id === id);
  if (!await confirmBox('Xoá bảng này?', `“${esc(b.title)}” sẽ bị xoá vĩnh viễn và không thể khôi phục.`)) return;
  await DB.del('boards', id); await DB.del('boardData', id);
  S.boards = S.boards.filter(x => x.id !== id);
  if (S.boardId === id) {
    S.boardId = null; contentDirty = viewDirty = false;
    const next = boardsOf(S.studentId)[0] || await createBoard(S.studentId, false);
    await openBoard(next.id);
  }
  renderPanel(); renderSidebar();
}
async function editBoardMeta(id) {
  const b = S.boards.find(x => x.id === id);
  const r = await formBox('Sửa thông tin bảng', [
    { name: 'title', label: 'Tên bảng', value: b.title },
    { name: 'date', label: 'Ngày', type: 'date', value: b.date },
    { name: 'owner', label: 'Thuộc về', type: 'select', value: b.studentId, options: [['all', 'Lớp chung'], ...S.students.map(s => [s.id, s.name])] },
  ], 'Lưu');
  if (!r) return;
  b.title = r.title.trim() || b.title; b.date = r.date || b.date; b.studentId = r.owner;
  await DB.put('boards', b);
  if (b.studentId !== S.studentId && S.boardId === id) { S.studentId = b.studentId; }
  renderTopbar(); renderPanel(); renderSidebar();
}
const boardsOf = sid => S.boards.filter(b => b.studentId === sid).sort((a, b) => (b.date.localeCompare(a.date)) || (b.updatedAt - a.updatedAt));
const filesOf = sid => S.files.filter(f => f.studentId === sid).sort((a, b) => b.createdAt - a.createdAt);

async function selectStudent(id) {
  S.studentId = id; S.settings.lastStudent = id; saveSettings();
  renderSidebar(); renderPanel();
  if (S.tab === 'boards' || true) {
    const cur = S.boards.find(b => b.id === S.boardId);
    if (!cur || cur.studentId !== id) { const first = boardsOf(id)[0]; if (first) await openBoard(first.id); }
  }
  if (innerWidth <= 900) { /* giữ panel mở trên màn nhỏ */ }
}
async function studentModal(st) {
  let color = st?.color || STUDENT_COLORS[S.students.length % STUDENT_COLORS.length];
  const body = document.createElement('div');
  body.innerHTML = `
    <div class="field"><label>Tên học sinh</label><input type="text" name="name" value="${esc(st?.name || '')}" placeholder="VD: Nguyễn Minh An"></div>
    <div class="field"><label>Lớp / ghi chú ngắn (tuỳ chọn)</label><input type="text" name="grade" value="${esc(st?.grade || '')}" placeholder="VD: Lớp 5 · Toán, Tiếng Việt"></div>
    <div class="field"><label>Màu nhận diện</label><div class="color-pick">${STUDENT_COLORS.map(c => `<button type="button" data-c="${c}" class="${c === color ? 'active' : ''}" style="background:${c}"></button>`).join('')}</div></div>`;
  body.querySelector('.color-pick').addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return; color = b.dataset.c;
    $$('.color-pick button', body).forEach(x => x.classList.toggle('active', x === b));
  });
  const actions = [{ label: 'Huỷ' }, {
    label: st ? 'Lưu' : 'Thêm học sinh', kind: 'primary', onClick: async () => {
      const name = $('[name=name]', body).value.trim(); if (!name) { $('[name=name]', body).focus(); return false; }
      const grade = $('[name=grade]', body).value.trim();
      if (st) { Object.assign(st, { name, grade, color }); await DB.put('students', st); renderSidebar(); renderPanel(); renderTopbar(); }
      else {
        const ns = { id: uid(), name, grade, color, note: '', createdAt: Date.now() };
        await DB.put('students', ns); S.students.push(ns);
        await selectStudent(ns.id);
        await createBoard(ns.id, true);
        toast(`Đã thêm ${name} và tạo bảng đầu tiên`);
      }
    }
  }];
  if (st) actions.unshift({ label: 'Xoá học sinh', kind: 'ghost danger-text', onClick: async () => { await deleteStudent(st); } });
  openModal({ title: st ? 'Sửa học sinh' : 'Thêm học sinh', body, actions });
}
async function deleteStudent(st) {
  const nb = S.boards.filter(b => b.studentId === st.id).length, nf = S.files.filter(f => f.studentId === st.id).length;
  if (!await confirmBox(`Xoá học sinh ${esc(st.name)}?`, `Sẽ xoá cả ${nb} bảng và ${nf} tài liệu của học sinh này trên máy. Tệp đã lưu lên Google Drive vẫn giữ nguyên.`)) return false;
  for (const b of S.boards.filter(b => b.studentId === st.id)) { await DB.del('boards', b.id); await DB.del('boardData', b.id); }
  for (const f of S.files.filter(f => f.studentId === st.id)) await DB.del('files', f.id);
  await DB.del('students', st.id);
  S.boards = S.boards.filter(b => b.studentId !== st.id); S.files = S.files.filter(f => f.studentId !== st.id); S.students = S.students.filter(s => s.id !== st.id);
  if (!S.boards.find(b => b.id === S.boardId)) { S.boardId = null; contentDirty = viewDirty = false; }
  S.studentId = 'all';
  const next = boardsOf('all')[0] || await createBoard('all', false);
  if (!S.boardId) await openBoard(next.id);
  renderSidebar(); renderPanel(); renderTopbar();
}

/* ---- Thanh bên ---- */
function renderSidebar() {
  const nav = $('#studentNav');
  const cnt = id => S.boards.filter(b => b.studentId === id).length;
  const students = [...S.students].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  nav.innerHTML = `
    <button class="nav-item ${S.studentId === 'all' ? 'active' : ''}" data-student="all">${avatarHTML('all')}<span class="name">Lớp chung</span><span class="count">${cnt('all')}</span></button>
    <div class="side-label"><span>Học sinh · ${students.length}</span><button id="btnAddStudent" title="Thêm học sinh">${ic('plus', 16)}</button></div>
    ${students.map(s => `<button class="nav-item ${S.studentId === s.id ? 'active' : ''}" data-student="${s.id}">${avatarHTML(s.id)}<span class="name">${esc(s.name)}</span><span class="count">${cnt(s.id)}</span></button>`).join('')
    || `<div class="side-empty">Chưa có học sinh nào.<br>Bấm <b>+</b> để thêm — mỗi em sẽ có bảng, tài liệu và ghi chú riêng.</div>`}`;
}
$('#studentNav').addEventListener('click', e => {
  if (e.target.closest('#btnAddStudent')) return studentModal(null);
  const it = e.target.closest('[data-student]'); if (it) selectStudent(it.dataset.student);
});

/* ---- Bảng điều khiển học sinh ---- */
function renderPanel() {
  const p = $('#panel'); const sid = S.studentId; const st = studentById(sid);
  const nb = S.boards.filter(b => b.studentId === sid).length, nf = S.files.filter(f => f.studentId === sid).length;
  p.innerHTML = `
    <div class="panel-head">${avatarHTML(sid, 'lg')}
      <div class="ttl"><h2>${esc(ownerName(sid))}</h2><div class="sub">${st?.grade ? esc(st.grade) + ' · ' : ''}${nb} bảng · ${nf} tài liệu</div></div>
      ${st ? `<button class="icon-btn" id="btnEditStudent" title="Sửa thông tin học sinh">${ic('edit', 18)}</button>` : ''}
    </div>
    <div class="tabs">
      <button class="tab ${S.tab === 'boards' ? 'active' : ''}" data-tab="boards">${ic('board', 16)}Bảng</button>
      <button class="tab ${S.tab === 'files' ? 'active' : ''}" data-tab="files">${ic('file', 16)}Tài liệu</button>
      <button class="tab ${S.tab === 'notes' ? 'active' : ''}" data-tab="notes">${ic('note', 16)}Ghi chú</button>
    </div>
    <div class="panel-body" id="panelBody"></div>`;
  const body = $('#panelBody');
  if (S.tab === 'boards') renderBoardsTab(body); else if (S.tab === 'files') renderFilesTab(body); else renderNotesTab(body);
}
$('#panel').addEventListener('click', e => {
  const t = e.target.closest('[data-tab]'); if (t) { S.tab = t.dataset.tab; renderPanel(); return; }
  if (e.target.closest('#btnEditStudent')) studentModal(studentById(S.studentId));
});

function renderBoardsTab(body) {
  const q = S.search.trim().toLowerCase();
  const list = boardsOf(S.studentId).filter(b => !q || b.title.toLowerCase().includes(q) || shortDate(b.date).includes(q));
  const groups = {}; list.forEach(b => (groups[b.date] = groups[b.date] || []).push(b));
  const today = todayStr();
  body.innerHTML = `
    <button class="btn primary block" id="btnNewBoard">${ic('plus', 17)}Bảng mới hôm nay</button>
    <div class="search" style="margin-top:10px">${ic('search', 16)}<input id="boardSearch" placeholder="Tìm bảng theo tên hoặc ngày…" value="${esc(S.search)}"></div>
    ${Object.keys(groups).sort().reverse().map(d => `
      <div class="group-label ${d === today ? 'today' : ''}"><span class="dot"></span>${d === today ? 'Hôm nay · ' : ''}${fmtDateLong(d)}</div>
      ${groups[d].map(b => `
        <div class="board-card ${b.id === S.boardId ? 'active' : ''}" data-board="${b.id}">
          <div class="thumb">${b.thumb ? `<img src="${b.thumb}" alt="">` : ''}</div>
          <div class="meta"><div class="t">${esc(b.title)}</div><div class="s">Sửa lúc ${fmtTime(b.updatedAt)}</div></div>
          <button class="icon-btn sm more" data-bmenu="${b.id}" title="Tuỳ chọn">${ic('more', 18)}</button>
        </div>`).join('')}`).join('')
    || `<div class="empty"><div class="big">${q ? 'Không tìm thấy bảng' : 'Chưa có bảng nào'}</div>${q ? 'Thử từ khoá khác.' : 'Bấm “Bảng mới hôm nay” để bắt đầu buổi học.'}</div>`}`;
  $('#btnNewBoard', body).onclick = () => createBoard(S.studentId, true);
  const si = $('#boardSearch', body);
  si.oninput = () => { S.search = si.value; const pos = si.selectionStart; renderBoardsTab(body); const n = $('#boardSearch', body); n.focus(); n.setSelectionRange(pos, pos); };
  body.onclick = e => {
    const m = e.target.closest('[data-bmenu]');
    if (m) { e.stopPropagation(); const id = m.dataset.bmenu; popMenu(m, [
      { icon: 'edit', label: 'Đổi tên, ngày, chủ sở hữu', onClick: () => editBoardMeta(id) },
      { icon: 'copy', label: 'Nhân bản (dùng làm mẫu)', onClick: () => duplicateBoard(id) },
      '-', { icon: 'trash', label: 'Xoá bảng', danger: true, onClick: () => deleteBoard(id) }]); return; }
    const c = e.target.closest('[data-board]'); if (!c) return;
    if (c.dataset.board !== S.boardId) openBoard(c.dataset.board);
    if (innerWidth <= 900) $('#app').classList.add('focus');
  };
}

const FILE_COLORS = { pdf: '#C0574A', img: '#6F93B8', doc: '#4F78B0', xls: '#5E8B5A', ppt: '#C9824B', vid: '#8E7CB0', aud: '#5FA3A0', other: '#A39684' };
function fileKind(f) {
  const t = f.type || '', n = f.name.toLowerCase();
  if (t === 'application/pdf' || n.endsWith('.pdf')) return ['pdf', 'PDF'];
  if (t.startsWith('image/')) return ['img', (n.split('.').pop() || 'IMG').slice(0, 4).toUpperCase()];
  if (/\.(docx?|odt|rtf|txt)$/.test(n)) return ['doc', 'DOC'];
  if (/\.(xlsx?|ods|csv)$/.test(n)) return ['xls', 'XLS'];
  if (/\.(pptx?|odp|key)$/.test(n)) return ['ppt', 'PPT'];
  if (t.startsWith('video/')) return ['vid', 'VID'];
  if (t.startsWith('audio/')) return ['aud', 'MP3'];
  return ['other', (n.split('.').pop() || 'FILE').slice(0, 4).toUpperCase()];
}
const canBoard = f => ['pdf', 'img'].includes(fileKind(f)[0]);
function renderFilesTab(body) {
  const list = filesOf(S.studentId);
  body.innerHTML = `
    <label class="dropzone" id="dropzone">${ic('upload', 24)}<b>Tải tài liệu lên</b><br>Kéo thả hoặc bấm để chọn tệp<br><span style="font-size:12px">Ảnh và PDF có thể đưa thẳng lên bảng</span></label>
    <div class="drive-row">
      <button class="btn outline sm" id="btnDrivePick">${ic('cloudDown', 16)}Lấy từ Drive</button>
      <button class="btn outline sm" id="btnDriveAll" ${list.some(f => !f.driveId) ? '' : 'disabled'}>${ic('cloudUp', 16)}Lưu hết lên Drive</button>
    </div>
    ${list.map(f => { const [k, lbl] = fileKind(f); return `
      <div class="file-row" data-file="${f.id}">
        <div class="ficon" style="background:${FILE_COLORS[k]}">${lbl}</div>
        <div class="fmeta"><div class="fname" title="${esc(f.name)}">${esc(f.name)}</div>
          <div class="fsub"><span>${fmtSize(f.size)} · ${fmtDT(f.createdAt)}</span>${f.driveId ? `<span class="drive-tag" title="Đã lưu trên Google Drive">${ic('cloud', 12)}Drive</span>` : ''}</div></div>
        <div class="factions">
          ${canBoard(f) ? `<button class="icon-btn sm" data-fact="board" title="Đưa lên bảng">${ic('toBoard', 17)}</button>` : ''}
          <button class="icon-btn sm" data-fact="menu" title="Tuỳ chọn">${ic('more', 17)}</button>
        </div>
      </div>`; }).join('')
    || `<div class="empty"><div class="big">Chưa có tài liệu</div>Đề bài, phiếu bài tập, ảnh chụp vở… của ${esc(ownerName(S.studentId))} sẽ được lưu ở đây.</div>`}`;
  const dz = $('#dropzone', body);
  dz.onclick = e => { e.preventDefault(); $('#fileUpload').click(); };
  dz.ondragover = e => { e.preventDefault(); e.stopPropagation(); dz.classList.add('over'); };
  dz.ondragleave = () => dz.classList.remove('over');
  dz.ondrop = e => { e.preventDefault(); e.stopPropagation(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); };
  $('#btnDrivePick', body).onclick = drivePickToStudent;
  $('#btnDriveAll', body).onclick = async () => { for (const f of filesOf(S.studentId).filter(f => !f.driveId)) { if (!await uploadFileToDrive(f, true)) break; } renderPanel(); };
  body.onclick = e => {
    const row = e.target.closest('[data-file]'); const a = e.target.closest('[data-fact]'); if (!row || !a) return;
    const f = S.files.find(x => x.id === row.dataset.file);
    if (a.dataset.fact === 'board') return insertBlob(f.blob, f.name);
    popMenu(a, [
      ...(canBoard(f) ? [{ icon: 'toBoard', label: 'Đưa lên bảng', onClick: () => insertBlob(f.blob, f.name) }] : []),
      { icon: 'eye', label: 'Mở xem', onClick: () => { const u = URL.createObjectURL(f.blob); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 60000); } },
      { icon: 'download', label: 'Tải về máy', onClick: () => download(f.blob, f.name) },
      f.driveId ? { icon: 'external', label: 'Mở trên Google Drive', onClick: () => window.open(f.driveLink || `https://drive.google.com/file/d/${f.driveId}/view`, '_blank') }
        : { icon: 'cloudUp', label: 'Lưu lên Google Drive', onClick: async () => { await uploadFileToDrive(f); renderPanel(); } },
      { icon: 'edit', label: 'Đổi tên', onClick: async () => { const r = await formBox('Đổi tên tài liệu', [{ name: 'n', label: 'Tên', value: f.name }], 'Lưu'); if (r && r.n.trim()) { f.name = r.n.trim(); await DB.put('files', f); renderPanel(); } } },
      '-', { icon: 'trash', label: 'Xoá khỏi máy', danger: true, onClick: async () => {
        if (!await confirmBox('Xoá tài liệu?', `“${esc(f.name)}” sẽ bị xoá khỏi trình duyệt.${f.driveId ? ' Bản trên Google Drive vẫn giữ nguyên.' : ''}`)) return;
        await DB.del('files', f.id); S.files = S.files.filter(x => x.id !== f.id); renderPanel(); } },
    ]);
  };
}
async function addFiles(files, studentId = S.studentId, meta = {}) {
  let n = 0;
  for (const file of files) {
    const f = { id: uid(), studentId, name: file.name || 'tai-lieu', type: file.type || '', size: file.size, blob: file, createdAt: Date.now(), ...meta };
    try { await DB.put('files', f); S.files.push(f); n++; } catch (err) { toast('Không lưu được ' + f.name, true); }
  }
  if (n) { S.tab = 'files'; renderPanel(); toast(`Đã lưu ${n} tài liệu cho ${ownerName(studentId)}`); }
}
function renderNotesTab(body) {
  const st = studentById(S.studentId);
  body.innerHTML = `<textarea class="note-area" id="noteArea" placeholder="${st ? `Ghi chú về ${esc(st.name)}: tiến độ, điểm cần lưu ý, bài tập về nhà…` : 'Ghi chú chung cho cả lớp: lịch học, nội dung tuần này…'}">${esc(st ? st.note || '' : S.settings.classNote || '')}</textarea>
    <div class="hint">Ghi chú tự lưu khi bạn gõ.</div>`;
  let t; $('#noteArea', body).oninput = e => {
    clearTimeout(t); const v = e.target.value;
    t = setTimeout(() => { if (st) { st.note = v; DB.put('students', st); } else { S.settings.classNote = v; saveSettings(); } }, 500);
  };
}

/* ---- Thanh trên ---- */
function renderTopbar() {
  const b = S.boards.find(x => x.id === S.boardId); if (!b) return;
  $('#ownerChip').innerHTML = `${avatarHTML(b.studentId)}<span>${esc(ownerName(b.studentId))}</span>`;
  $('#boardTitle').value = b.title; $('#boardDate').value = b.date; $('#bgSelect').value = E.bg;
  document.title = `${b.title} · Vincenink`;
}
function bindTopbar() {
  $('#bgSelect').innerHTML = BGS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  $('#bgSelect').onchange = e => { E.bg = e.target.value; requestRender(true); scheduleSave(true); };
  const title = $('#boardTitle');
  title.onchange = async () => { const b = S.boards.find(x => x.id === S.boardId); if (!b) return; b.title = title.value.trim() || b.title; title.value = b.title; await DB.put('boards', b); renderPanel(); renderTopbar(); };
  title.onkeydown = e => { if (e.key === 'Enter' || e.key === 'Escape') title.blur(); };
  $('#boardDate').onchange = async e => { const b = S.boards.find(x => x.id === S.boardId); if (!b || !e.target.value) return; b.date = e.target.value; await DB.put('boards', b); renderPanel(); };
  $('#ownerChip').onclick = () => { const b = S.boards.find(x => x.id === S.boardId); if (b) { $('#app').classList.remove('focus'); selectStudent(b.studentId); } };
  $('#btnFocus').onclick = toggleFocus;
  $('#btnFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); };
  $('#btnExport').onclick = async () => { const blob = await renderBoardPNG(); if (!blob) return toast('Bảng đang trống'); download(blob, safeName($('#boardTitle').value) + '.png'); };
  $('#btnDriveSave').onclick = saveBoardToDrive;
  $('#btnSettings').onclick = settingsModal;
}
function toggleFocus() { $('#app').classList.toggle('focus'); setTimeout(resize, 0); }

/* =====================================================================
   Google Drive
   ===================================================================== */
const Drive = {
  token: null, exp: 0,
  ready() { return !!S.settings.clientId; },
  async ensureToken(force) {
    if (!force && this.token && Date.now() < this.exp) return this.token;
    await loadScript('https://accounts.google.com/gsi/client');
    return new Promise((res, rej) => {
      const tc = google.accounts.oauth2.initTokenClient({
        client_id: S.settings.clientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: r => { if (r.error) rej(new Error(r.error_description || r.error)); else { this.token = r.access_token; this.exp = Date.now() + (r.expires_in - 60) * 1000; res(this.token); } },
        error_callback: e => rej(new Error(e.message || e.type || 'Đăng nhập Google bị huỷ')),
      });
      tc.requestAccessToken({ prompt: this.token ? '' : 'consent' });
    });
  },
  async fetch(url, opts = {}, retry = true) {
    await this.ensureToken();
    const r = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: 'Bearer ' + this.token } });
    if (r.status === 401 && retry) { this.token = null; return this.fetch(url, opts, false); }
    if (!r.ok) { let m = r.status + ''; try { m = (await r.json()).error.message; } catch (e) { /* */ } throw new Error(m); }
    return r;
  },
  async folder(name, parent) {
    const qn = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const q = `name='${qn}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parent || 'root'}' in parents`;
    const r = await (await this.fetch('https://www.googleapis.com/drive/v3/files?fields=files(id,name)&q=' + encodeURIComponent(q))).json();
    if (r.files && r.files.length) return r.files[0].id;
    const c = await (await this.fetch('https://www.googleapis.com/drive/v3/files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parent ? [parent] : [] }),
    })).json();
    return c.id;
  },
  async studentFolder(sid, sub) {
    const root = await this.folder('Vincenink');
    let f = await this.folder(ownerName(sid), root);
    if (sub) f = await this.folder(sub, f);
    return f;
  },
  async upload(blob, name, parent) {
    const fd = new FormData();
    fd.append('metadata', new Blob([JSON.stringify({ name, parents: [parent] })], { type: 'application/json' }));
    fd.append('file', blob, name);
    return (await this.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', { method: 'POST', body: fd })).json();
  },
  async pick() {
    if (!S.settings.apiKey) throw new Error('Cần nhập API key trong Cài đặt để mở trình chọn tệp Drive');
    await this.ensureToken();
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise(r => gapi.load('picker', r));
    return new Promise(res => {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS).setIncludeFolders(true).setSelectFolderEnabled(false);
      new google.picker.PickerBuilder().addView(view)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setOAuthToken(this.token).setDeveloperKey(S.settings.apiKey.trim())
        .setAppId(S.settings.clientId.split('-')[0]).setLocale('vi')
        .setCallback(d => { if (d.action === google.picker.Action.PICKED) res(d.docs); else if (d.action === google.picker.Action.CANCEL) res([]); })
        .build().setVisible(true);
    });
  },
  async downloadFile(doc) {
    if ((doc.mimeType || '').startsWith('application/vnd.google-apps.')) {
      const r = await this.fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=application/pdf`);
      return { blob: await r.blob(), name: doc.name.replace(/\.pdf$/i, '') + '.pdf', type: 'application/pdf' };
    }
    const r = await this.fetch(`https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`);
    return { blob: await r.blob(), name: doc.name, type: doc.mimeType };
  },
};
function needDrive() {
  if (Drive.ready()) return true;
  toast('Hãy kết nối Google Drive trong Cài đặt trước', true); settingsModal(); return false;
}
function driveErr(err) { console.error(err); toast('Google Drive: ' + (err.message || err), true); }
async function uploadFileToDrive(f, quiet) {
  if (!needDrive()) return false;
  try {
    if (!quiet) toast('Đang lưu lên Drive…');
    const folder = await Drive.studentFolder(f.studentId, 'Tài liệu');
    const r = await Drive.upload(f.blob, f.name, folder);
    f.driveId = r.id; f.driveLink = r.webViewLink; await DB.put('files', f);
    toast(`Đã lưu “${f.name}” vào Drive › Vincenink › ${ownerName(f.studentId)}`);
    return true;
  } catch (err) { driveErr(err); return false; }
}
async function drivePickToStudent() {
  if (!needDrive()) return;
  try {
    const docs = await Drive.pick(); if (!docs.length) return;
    toast(`Đang tải ${docs.length} tệp từ Drive…`);
    for (const d of docs) {
      if (d.mimeType === 'application/vnd.google-apps.folder') continue;
      const { blob, name, type } = await Drive.downloadFile(d);
      const file = new File([blob], name, { type: type || blob.type });
      await addFiles([file], S.studentId, { driveId: d.id, driveLink: d.url });
    }
  } catch (err) { driveErr(err); }
}
async function saveBoardToDrive() {
  if (!needDrive()) return;
  const blob = await renderBoardPNG(); if (!blob) return toast('Bảng đang trống');
  const b = S.boards.find(x => x.id === S.boardId);
  try {
    toast('Đang lưu ảnh bảng lên Drive…');
    const folder = await Drive.studentFolder(b.studentId, 'Bảng');
    await Drive.upload(blob, `${b.date} - ${safeName(b.title)}.png`, folder);
    toast(`Đã lưu vào Drive › Vincenink › ${ownerName(b.studentId)} › Bảng`);
  } catch (err) { driveErr(err); }
}

/* =====================================================================
   Sao lưu / khôi phục
   ===================================================================== */
async function buildBackup() {
  await doSave();
  const boardData = await DB.all('boardData');
  const files = [];
  for (const f of S.files) { const { blob, ...rest } = f; files.push({ ...rest, data: await blobToDataURL(blob) }); }
  return new Blob([JSON.stringify({ app: 'vincenink', version: 1, exportedAt: Date.now(), students: S.students, boards: S.boards, boardData, files, classNote: S.settings.classNote })], { type: 'application/json' });
}
async function exportBackup() { toast('Đang tạo bản sao lưu…'); download(await buildBackup(), `vincenink-saoluu-${todayStr()}.json`); }
async function backupToDrive() {
  if (!needDrive()) return;
  try { toast('Đang sao lưu lên Drive…'); const root = await Drive.folder('Vincenink'); const f = await Drive.folder('Sao lưu', root);
    await Drive.upload(await buildBackup(), `vincenink-saoluu-${todayStr()}-${fmtTime(Date.now()).replace(':', 'h')}.json`, f);
    toast('Đã sao lưu vào Drive › Vincenink › Sao lưu');
  } catch (err) { driveErr(err); }
}
async function importBackup(file) {
  try {
    const data = JSON.parse(await file.text());
    if (data.app !== 'vincenink') throw new Error('Tệp không phải bản sao lưu Vincenink');
    if (!await confirmBox('Khôi phục bản sao lưu?', `Dữ liệu hiện tại trên máy sẽ được <b>thay thế</b> bằng bản sao lưu ngày ${fmtDT(data.exportedAt)} (${data.students.length} học sinh, ${data.boards.length} bảng, ${data.files.length} tài liệu).`, 'Khôi phục', false)) return;
    for (const s of ['students', 'boards', 'boardData', 'files']) await DB.clear(s);
    for (const s of data.students) await DB.put('students', s);
    for (const b of data.boards) await DB.put('boards', b);
    for (const d of data.boardData) await DB.put('boardData', d);
    for (const f of data.files) { const { data: u, ...rest } = f; await DB.put('files', { ...rest, blob: await dataURLToBlob(u) }); }
    S.settings.classNote = data.classNote || ''; S.settings.lastBoard = null; S.settings.lastStudent = 'all'; await saveSettings();
    contentDirty = viewDirty = false; location.reload();
  } catch (err) { toast('Không khôi phục được: ' + err.message, true); }
}

/* =====================================================================
   Cài đặt
   ===================================================================== */
function settingsModal() {
  const s = S.settings; const origin = location.origin;
  const body = document.createElement('div');
  body.innerHTML = `
    <label class="switch"><input type="checkbox" id="setPen" ${s.penOnly ? 'checked' : ''}><span class="knob"></span>
      <span class="lbl">Chỉ viết bằng bút cảm ứng<small>Dành cho iPad/máy tính bảng: Apple Pencil để viết, ngón tay chỉ để kéo và phóng to — tránh lỡ tay chạm lòng bàn tay vào bảng.</small></span></label>

    <div class="set-section">
      <h4>Kết nối Google Drive</h4>
      <p class="muted" style="font-size:13px">Để lưu tài liệu và bảng lên Drive của bạn. Chỉ cần làm một lần (khoảng 5 phút):</p>
      <ol class="steps">
        <li>Vào <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console</a>, tạo dự án mới.</li>
        <li>Bật <b>Google Drive API</b> và <b>Google Picker API</b>.</li>
        <li>Mục <b>OAuth consent screen</b>: chọn External, thêm email của bạn vào Test users.</li>
        <li>Mục <b>Credentials</b> → tạo <b>OAuth client ID</b> loại Web, thêm <i>Authorized JavaScript origins</i>: <code>${esc(origin.startsWith('http') ? origin : 'http://localhost:8080')}</code></li>
        <li>Tạo thêm một <b>API key</b>, rồi dán cả hai vào đây.</li>
      </ol>
      ${origin.startsWith('http') ? '' : `<p class="hint" style="color:var(--danger)">Bạn đang mở trang trực tiếp từ tệp. Google Drive chỉ chạy khi mở qua tệp <b>Mo-Vincenink.command</b> (địa chỉ http://localhost:8080).</p>`}
      <div class="field"><label>OAuth Client ID</label><input type="text" id="setCid" value="${esc(s.clientId)}" placeholder="xxxxxxxx.apps.googleusercontent.com"></div>
      <div class="field"><label>API key (cho trình chọn tệp)</label><input type="password" id="setKey" value="${esc(s.apiKey)}" placeholder="AIza…"></div>
      <button class="btn soft sm" id="setTest">${ic('cloud', 16)}Lưu &amp; thử kết nối</button>
    </div>

    <div class="set-section">
      <h4>Sao lưu dữ liệu</h4>
      <p class="muted" style="font-size:13px">Dữ liệu được lưu ngay trong trình duyệt trên máy này. Thỉnh thoảng hãy sao lưu để không mất bài giảng.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn outline sm" id="setExport">${ic('download', 16)}Tải bản sao lưu</button>
        <button class="btn outline sm" id="setImport">${ic('upload', 16)}Khôi phục từ tệp</button>
        <button class="btn outline sm" id="setDrive">${ic('cloudUp', 16)}Sao lưu lên Drive</button>
      </div>
    </div>

    <div class="set-section">
      <h4>Phím tắt</h4>
      <div class="kbd-grid">
        <span><kbd>P</kbd> <kbd>M</kbd> <kbd>E</kbd></span><span>Bút · Dạ quang · Tẩy</span>
        <span><kbd>L</kbd> <kbd>S</kbd> <kbd>T</kbd> <kbd>K</kbd></span><span>Khoanh vùng · Hình · Chữ · Laser</span>
        <span><kbd>Space</kbd> + kéo</span><span>Di chuyển bảng</span>
        <span><kbd>Ctrl</kbd> + cuộn</span><span>Phóng to / thu nhỏ</span>
        <span><kbd>[</kbd> <kbd>]</kbd></span><span>Giảm / tăng độ dày</span>
        <span><kbd>1</kbd> … <kbd>8</kbd></span><span>Chọn nhanh màu</span>
        <span><kbd>Ctrl</kbd> <kbd>Z</kbd> / <kbd>Ctrl</kbd> <kbd>⇧</kbd> <kbd>Z</kbd></span><span>Hoàn tác / Làm lại</span>
        <span><kbd>Delete</kbd> · <kbd>Ctrl</kbd> <kbd>D</kbd></span><span>Xoá / nhân bản vùng chọn</span>
        <span><kbd>F</kbd></span><span>Ẩn/hiện thanh bên</span>
      </div>
    </div>`;
  const saveDriveFields = () => { s.clientId = $('#setCid', body).value.trim(); s.apiKey = $('#setKey', body).value.trim(); saveSettings(); };
  $('#setPen', body).onchange = e => { s.penOnly = e.target.checked; saveSettings(); };
  $('#setTest', body).onclick = async () => {
    saveDriveFields(); if (!s.clientId) return toast('Hãy nhập Client ID', true);
    try { Drive.token = null; await Drive.ensureToken(true); await Drive.folder('Vincenink'); toast('Kết nối Google Drive thành công ✓'); } catch (err) { driveErr(err); }
  };
  $('#setExport', body).onclick = exportBackup;
  $('#setImport', body).onclick = () => $('#fileImport').click();
  $('#setDrive', body).onclick = () => { saveDriveFields(); backupToDrive(); };
  openModal({ title: 'Cài đặt & sao lưu', body, width: 560, actions: [{ label: 'Xong', kind: 'primary', onClick: saveDriveFields }], onClose: saveDriveFields });
}

/* =====================================================================
   Hộp thoại, menu, thông báo
   ===================================================================== */
function openModal({ title, body, actions = [], width = 440, onClose }) {
  const back = document.createElement('div'); back.className = 'modal-back';
  back.innerHTML = `<div class="modal" style="width:min(${width}px,calc(100vw - 32px))"><div class="modal-head"><h3>${esc(title)}</h3><button class="icon-btn sm" data-close>${ic('x', 18)}</button></div><div class="modal-body"></div><div class="modal-foot"></div></div>`;
  const bodyEl = $('.modal-body', back); if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.append(body);
  const foot = $('.modal-foot', back); let closed = false;
  const close = () => { if (closed) return; closed = true; back.remove(); document.removeEventListener('keydown', onKey, true); onClose && onClose(); };
  actions.forEach(a => {
    const b = document.createElement('button'); b.className = 'btn ' + (a.kind || 'ghost'); b.textContent = a.label;
    if (a.kind && a.kind.includes('danger-text')) { b.style.color = 'var(--danger)'; b.style.marginRight = 'auto'; }
    b.onclick = async () => { const r = a.onClick ? await a.onClick(back) : undefined; if (r !== false) close(); };
    foot.append(b);
  });
  if (!actions.length) foot.remove();
  back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  $('[data-close]', back).onclick = close;
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') { e.preventDefault(); foot.querySelector('.btn.primary, .btn.danger:not(.ghost)')?.click(); }
  };
  document.addEventListener('keydown', onKey, true);
  $('#modalRoot').append(back);
  setTimeout(() => back.querySelector('.modal-body input[type=text], .modal-body input[type=number]')?.focus(), 30);
  return { el: back, close };
}
function confirmBox(title, msg, ok = 'Xoá', danger = true) {
  return new Promise(res => {
    let done = false;
    openModal({ title, body: `<p class="muted">${msg}</p>`, actions: [{ label: 'Huỷ' }, { label: ok, kind: danger ? 'danger' : 'primary', onClick: () => { done = true; res(true); } }], onClose: () => { if (!done) res(false); } });
  });
}
function formBox(title, fields, ok = 'Lưu', intro = '', row = false) {
  return new Promise(res => {
    let done = false; const body = document.createElement('div');
    const fh = f => `<div class="field"><label>${esc(f.label)}</label>${f.type === 'select'
      ? `<select name="${f.name}">${f.options.map(([v, l]) => `<option value="${esc(v)}" ${v === f.value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`
      : `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(f.value ?? '')}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''}>`}</div>`;
    body.innerHTML = intro + (row ? `<div class="row2">${fields.map(fh).join('')}</div>` : fields.map(fh).join(''));
    openModal({ title, body, actions: [{ label: 'Huỷ' }, { label: ok, kind: 'primary', onClick: () => { const o = {}; fields.forEach(f => o[f.name] = $(`[name="${f.name}"]`, body).value); done = true; res(o); } }], onClose: () => { if (!done) res(null); } });
  });
}
let menuEl = null;
function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener('pointerdown', outsideMenu, true); } }
function outsideMenu(e) { if (menuEl && !menuEl.contains(e.target)) closeMenu(); }
function popMenu(anchor, items) {
  closeMenu(); const m = document.createElement('div'); m.className = 'popmenu';
  items.forEach(it => {
    if (it === '-') { m.insertAdjacentHTML('beforeend', '<div class="sep"></div>'); return; }
    const b = document.createElement('button'); if (it.danger) b.className = 'danger';
    b.innerHTML = ic(it.icon, 17) + esc(it.label); b.onclick = () => { closeMenu(); it.onClick(); }; m.append(b);
  });
  document.body.append(m); menuEl = m;
  const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
  m.style.left = clamp(r.right - mw, 8, innerWidth - mw - 8) + 'px';
  m.style.top = (r.bottom + mh + 8 > innerHeight ? r.top - mh - 4 : r.bottom + 4) + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outsideMenu, true), 0);
}
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  const box = $('#toasts'); while (box.children.length > 2) box.firstChild.remove();
  box.append(t); setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, err ? 5000 : 2600);
}

/* =====================================================================
   Bàn phím, dán, kéo thả
   ===================================================================== */
const isTyping = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); };
document.addEventListener('keydown', e => {
  if ($('#modalRoot').children.length || isTyping()) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (e.code === 'Space') { if (!spaceDown) { spaceDown = true; cv.classList.add('t-hand'); } e.preventDefault(); return; }
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y') { e.preventDefault(); redo(); return; }
  if (mod && k === 'a') { e.preventDefault(); selectAll(); return; }
  if (mod && k === 'd') { e.preventDefault(); duplicateSelection(); return; }
  if (mod && (k === '=' || k === '+')) { e.preventDefault(); zoomAt(W / 2, H / 2, 1.25); return; }
  if (mod && k === '-') { e.preventDefault(); zoomAt(W / 2, H / 2, 0.8); return; }
  if (mod) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && E.sel.size) { e.preventDefault(); deleteSelection(); return; }
  if (e.key === 'Escape') { E.sel.clear(); closeMenu(); requestRender(); return; }
  const map = { h: 'hand', p: 'pen', m: 'marker', e: 'eraser', l: 'lasso', s: 'shape', t: 'text', k: 'laser' };
  if (map[k]) { setTool(map[k]); return; }
  if (k === 'i') { $('#fileInsert').click(); return; }
  if (k === 'f') { toggleFocus(); return; }
  if (k === '0') { zoomAt(W / 2, H / 2, 1 / E.view.s); return; }
  if (k === '+' || k === '=') { zoomAt(W / 2, H / 2, 1.25); return; }
  if (k === '-') { zoomAt(W / 2, H / 2, 0.8); return; }
  if (k === '[' || k === ']') {
    const kind = { pen: 'pen', marker: 'marker', eraser: 'eraser', shape: 'shape', text: 'text' }[E.tool]; if (!kind) return;
    const [mn, mx] = SIZE_RANGE[kind]; const step = Math.max(1, Math.round(E.sizes[kind] * 0.15));
    E.sizes[kind] = clamp(E.sizes[kind] + (k === ']' ? step : -step), mn, mx); savePrefs(); renderProps(); requestRender(); return;
  }
  if (/^[1-8]$/.test(k)) { if (E.tool === 'marker') { const c = MARKERS[+k - 1]; if (c) E.markerColor = c; } else { E.color = COLORS[+k - 1]; if (!['pen', 'shape', 'text'].includes(E.tool)) setTool('pen'); } savePrefs(); renderProps(); }
});
document.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; cv.classList.remove('t-hand'); cv.className = 't-' + E.tool; } });
window.addEventListener('blur', () => { spaceDown = false; });

document.addEventListener('paste', e => {
  if (isTyping() || $('#modalRoot').children.length) return;
  const files = [...(e.clipboardData?.files || [])];
  const f = files.find(x => x.type.startsWith('image/') || x.type === 'application/pdf');
  if (f) { e.preventDefault(); insertBlob(f, f.name); }
});
let dragDepth = 0;
wrap.addEventListener('dragenter', e => { if ([...e.dataTransfer.types].includes('Files')) { dragDepth++; wrap.classList.add('dragover'); } });
wrap.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) wrap.classList.remove('dragover'); });
wrap.addEventListener('dragover', e => e.preventDefault());
wrap.addEventListener('drop', async e => {
  e.preventDefault(); dragDepth = 0; wrap.classList.remove('dragover');
  for (const f of [...e.dataTransfer.files]) await insertBlob(f, f.name);
});
$('#fileInsert').onchange = async e => { for (const f of [...e.target.files]) await insertBlob(f, f.name); e.target.value = ''; };
$('#fileUpload').onchange = async e => { await addFiles([...e.target.files]); e.target.value = ''; };
$('#fileImport').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (f) { $$('.modal-back').forEach(m => m.remove()); importBackup(f); } };

/* =====================================================================
   Khởi động
   ===================================================================== */
async function init() {
  $$('[data-icon]').forEach(el => el.insertAdjacentHTML('afterbegin', ic(el.dataset.icon, el.classList.contains('icon-btn') ? 19 : 16)));
  loadPrefs();
  try { await DB.open(); } catch (err) { toast('Trình duyệt không cho lưu dữ liệu (IndexedDB). Hãy mở bằng Chrome/Safari bản mới.', true); return; }
  const [st, bo, fi, se] = await Promise.all([DB.all('students'), DB.all('boards'), DB.all('files'), DB.get('settings', 'main')]);
  S.students = st; S.boards = bo; S.files = fi; if (se) S.settings = { ...S.settings, ...se };
  S.studentId = (S.settings.lastStudent === 'all' || studentById(S.settings.lastStudent)) ? S.settings.lastStudent : 'all';
  buildToolbar(); bindTopbar(); setTool(E.tool);
  renderSidebar(); renderPanel();
  new ResizeObserver(resize).observe(wrap); resize();
  let b = S.boards.find(x => x.id === S.settings.lastBoard) || boardsOf(S.studentId)[0];
  if (!b) b = await createBoard(S.studentId, false);
  if (b.studentId !== S.studentId) { S.studentId = b.studentId; renderSidebar(); }
  await openBoard(b.id); renderPanel();
  if (innerWidth <= 900) $('#app').classList.add('focus');
  if (S.settings.clientId && location.origin.startsWith('http')) loadScript('https://accounts.google.com/gsi/client').catch(() => {});
  document.fonts && document.fonts.ready.then(() => { bbCache = new WeakMap(); requestRender(true); });
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}
init();
