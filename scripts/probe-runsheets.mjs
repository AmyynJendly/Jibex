/**
 * Read-only look at what the real server sends for the driver's runsheets,
 * a runsheet's items, and a tracking-number search — so the field mapper can
 * be checked against reality. Nothing is written.
 *
 *   npm run probe:runsheets
 *
 * Signs in with JIBEX_TEST_USERNAME / JIBEX_TEST_PASSWORD from .env.local
 * (gitignored). Customer names, phones and addresses are masked; the token is
 * never printed.
 */
const base = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://jibex.cloud/').replace(/\/+$/, '');
const username = process.env.JIBEX_TEST_USERNAME;
const password = process.env.JIBEX_TEST_PASSWORD;
if (!username || !password) {
  console.log('Set JIBEX_TEST_USERNAME and JIBEX_TEST_PASSWORD in .env.local first (see .env.example).');
  process.exit(1);
}

const PERSONAL = new Set(['recipientName', 'recipientPhone', 'recipientAddress', 'senderPhone', 'senderAddress', 'phone', 'email', 'fullName', 'driverName', 'driverPhone']);
const mask = (v) => (typeof v !== 'string' || v.length < 3 ? v : `${v.slice(0, 1)}…(${v.length})`);
const show = (key, value) => (PERSONAL.has(key) ? mask(value) : value);

/** Every field name seen across a list of objects, with the kinds of values it had. */
function fieldReport(objects) {
  const seen = new Map();
  for (const object of objects) {
    for (const [key, value] of Object.entries(object ?? {})) {
      const kind = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(kind);
    }
  }
  return [...seen].map(([key, kinds]) => `${key}: ${[...kinds].join('|')}`).join('\n    ');
}

async function call(path, init = {}) {
  const response = await fetch(`${base}/${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text.slice(0, 200);
  }
  return { status: response.status, body };
}

const login = await call('api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
if (login.status !== 200 || !login.body?.token) {
  console.log(`Login failed: HTTP ${login.status}`);
  process.exit(1);
}
const auth = { Authorization: `Bearer ${login.body.token}` };
const driverId = login.body.user.driverId;
const userId = login.body.user.id;
console.log(`Signed in. driverId=${driverId} userId=${userId}\n`);

// 1. Active runsheets — by the DRIVER id.
const active = await call(`api/runsheets/driver/${driverId}/active`, { headers: auth });
console.log(`GET api/runsheets/driver/${driverId}/active → HTTP ${active.status}`);
const runsheets = Array.isArray(active.body) ? active.body : [];
console.log(`  ${runsheets.length} runsheet(s)`);
if (runsheets.length) {
  console.log(`  runsheet fields:\n    ${fieldReport(runsheets)}`);
  for (const r of runsheets) {
    console.log(`  - id=${r.id} code=${r.code} status=${r.status} scheduledDate=${r.scheduledDate} totalParcels=${r.totalParcels} items=${Array.isArray(r.items) ? r.items.length : 'absent'} agency=${r.agency?.name ?? '-'}`);
  }
} else if (!Array.isArray(active.body)) {
  console.log('  body:', JSON.stringify(active.body).slice(0, 300));
}

// 2. Each runsheet in full. With nothing active, look at the driver's most
// recent finished ones instead (same endpoint), so there's real data to read.
let toInspect = runsheets;
if (!toInspect.length) {
  const all = await call(`api/runsheets?driverId=${driverId}`, { headers: auth });
  toInspect = (Array.isArray(all.body) ? all.body : []).slice(0, 6);
  console.log(`
Nothing active; inspecting ${toInspect.length} recent runsheet(s): ${toInspect.map((r) => `${r.id}(${r.status})`).join(', ')}`);
  if (toInspect.length) console.log(`  runsheet fields:
    ${fieldReport(toInspect)}`);
}
const allItems = [];
for (const r of toInspect) {
  const detail = await call(`api/runsheets/${r.id}`, { headers: auth });
  const items = Array.isArray(detail.body?.items) ? detail.body.items : [];
  allItems.push(...items);
  console.log(`\nGET api/runsheets/${r.id} → HTTP ${detail.status}, ${items.length} item(s)`);
  const topLevelDiff = Object.keys(detail.body ?? {}).filter((k) => !(k in r));
  if (topLevelDiff.length) console.log(`  fields only in the detail: ${topLevelDiff.join(', ')}`);
}
if (allItems.length) {
  console.log(`\nitem fields:\n    ${fieldReport(allItems)}`);
  const parcels = allItems.map((i) => i.parcel).filter(Boolean);
  console.log(`\nparcel fields:\n    ${fieldReport(parcels)}`);
  console.log('\nper item (cash fields side by side):');
  for (const item of allItems) {
    const p = item.parcel ?? {};
    console.log(
      `  item ${item.id} seq=${item.sequenceOrder} status=${item.status} reason=${item.failureReason ?? '-'} | ` +
        `parcel ${p.trackingNumber} status=${p.status} price=${p.price} amountToCollect=${p.amountToCollect} deliveryFee=${p.deliveryFee} ` +
        `isPaid=${p.isPaid} lat/lng=${p.recipientLat ?? '-'}/${p.recipientLng ?? '-'} attempts=${p.deliveryAttempts ?? '-'} city=${p.recipientCity ?? '-'}`
    );
  }
}

// 3. Tracking search, on the first real tracking number.
const tracking = allItems.find((i) => i.parcel?.trackingNumber)?.parcel.trackingNumber;
if (tracking) {
  const found = await call(`api/parcels/tracking/${encodeURIComponent(tracking)}`, { headers: auth });
  console.log(`\nGET api/parcels/tracking/<first tracking number> → HTTP ${found.status}`);
  if (found.body && typeof found.body === 'object') {
    console.log(`  fields:\n    ${fieldReport([found.body])}`);
    const b = found.body;
    console.log(`  price=${b.price} amountToCollect=${b.amountToCollect} deliveryFee=${b.deliveryFee} status=${b.status}`);
    for (const key of ['recipientName', 'recipientCity', 'senderName', 'agencyName', 'destinationAgencyName']) {
      if (key in b) console.log(`  ${key} = ${JSON.stringify(show(key, b[key]))}`);
    }
  }
  const missing = await call('api/parcels/tracking/NO-SUCH-TRACKING-0000', { headers: auth });
  console.log(`\nGET api/parcels/tracking/<unknown number> → HTTP ${missing.status} ${JSON.stringify(missing.body).slice(0, 200)}`);
}
