/**
 * Read-only look at `GET /api/runsheets?driverId={driverId}` — the driver's
 * runsheets of every status, which History and the Profile numbers read.
 * Shows the response's shape, which statuses come back, whether items ride
 * along, and whether a vehicle plate is present. Nothing is written.
 *
 *   npm run probe:history
 *
 * Signs in with JIBEX_TEST_USERNAME / JIBEX_TEST_PASSWORD from .env.local
 * (gitignored). People's names, phones and addresses are masked.
 */
const base = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://jibex.cloud/').replace(/\/+$/, '');
const username = process.env.JIBEX_TEST_USERNAME;
const password = process.env.JIBEX_TEST_PASSWORD;
if (!username || !password) {
  console.log('Set JIBEX_TEST_USERNAME and JIBEX_TEST_PASSWORD in .env.local first (see .env.example).');
  process.exit(1);
}

function kinds(objects) {
  const seen = new Map();
  for (const o of objects) {
    for (const [k, v] of Object.entries(o ?? {})) {
      const kind = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
      if (!seen.has(k)) seen.set(k, new Set());
      seen.get(k).add(kind);
    }
  }
  return [...seen].map(([k, ks]) => `    ${k}: ${[...ks].join('|')}`).join('\n');
}

async function call(path, init = {}) {
  const r = await fetch(`${base}/${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const t = await r.text();
  let body = null;
  try { body = t ? JSON.parse(t) : null; } catch { body = t.slice(0, 200); }
  return { status: r.status, body };
}

const login = await call('api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
if (login.status !== 200) { console.log(`Login failed: HTTP ${login.status}`); process.exit(1); }
const auth = { Authorization: `Bearer ${login.body.token}` };
const { driverId } = login.body.user;
console.log(`Signed in. driverId=${driverId}\n`);

const r = await call(`api/runsheets?driverId=${driverId}`, { headers: auth });
const shape = Array.isArray(r.body) ? `array of ${r.body.length}` : r.body && typeof r.body === 'object' ? `object with keys ${Object.keys(r.body).join(', ')}` : JSON.stringify(r.body);
console.log(`GET api/runsheets?driverId=${driverId} → HTTP ${r.status}, ${shape}`);

// Spring pages put the list under `content`.
const list = Array.isArray(r.body) ? r.body : Array.isArray(r.body?.content) ? r.body.content : [];
if (!list.length) process.exit(0);

console.log('\n  runsheet fields:');
console.log(kinds(list));

const byStatus = {};
for (const rs of list) byStatus[rs.status] = (byStatus[rs.status] ?? 0) + 1;
console.log(`\n  statuses: ${JSON.stringify(byStatus)}`);

const otherDrivers = list.filter((rs) => rs.driver && String(rs.driver.id) !== String(driverId)).length;
console.log(`  runsheets for a different driver id: ${otherDrivers}`);

for (const rs of list.slice(0, 20)) {
  const items = Array.isArray(rs.items) ? rs.items : null;
  const itemStatuses = {};
  for (const it of items ?? []) itemStatuses[it.status] = (itemStatuses[it.status] ?? 0) + 1;
  console.log(
    `    - id=${rs.id} ${rs.code ?? ''} status=${rs.status} date=${rs.scheduledDate ?? '-'} ` +
      `completedAt=${rs.completedAt ?? '-'} vehiclePlate=${rs.vehiclePlate ?? '(absent)'} ` +
      `items=${items ? items.length : 'absent'} ${JSON.stringify(itemStatuses)}`
  );
}

const items = list.flatMap((rs) => (Array.isArray(rs.items) ? rs.items : []));
if (items.length) {
  console.log('\n  item fields:');
  console.log(kinds(items));
}
