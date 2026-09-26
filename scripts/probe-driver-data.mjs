/**
 * Read-only look at what the real server sends for pickups, transfers,
 * returns and notifications — every field name and kind, anything beyond
 * what we expected, and any endpoint that answers empty or refuses.
 * Nothing is written.
 *
 *   npm run probe:driver-data
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

const EXPECTED = {
  pickup: ['id', 'requestNumber', 'status', 'pickupAddress', 'pickupCity', 'contactPerson', 'contactPhone', 'scheduledAt', 'estimatedParcelsCount', 'notes', 'sender'],
  pickupSender: ['id', 'name', 'senderName', 'phone'],
  transfer: ['id', 'transferNumber', 'status', 'transferType', 'fromAgency', 'toAgency', 'fromCompany', 'toCompany', 'driver', 'driverName', 'driverPhone', 'vehicleRegistration', 'parcels', 'notes', 'createdAt', 'validatedAt', 'shippedAt', 'receivedAt', 'closedAt', 'cancelledAt', 'confirmedAt', 'completedAt', 'scanDeparture', 'scanArrival', 'missingParcels', 'extraParcels', 'damagedParcels', 'discrepancyNotes'],
  notification: ['id', 'title', 'message', 'type', 'isRead', 'createdAt', 'referenceId', 'referenceType'],
};

const PERSONAL = /name|phone|address|email|contact/i;
const mask = (key, v) => (typeof v === 'string' && PERSONAL.test(key) && v.length > 2 ? `${v[0]}…(${v.length})` : v);

function kinds(objects) {
  const seen = new Map();
  for (const o of objects) {
    for (const [k, v] of Object.entries(o ?? {})) {
      const kind = v === null ? 'null' : Array.isArray(v) ? `array` : typeof v;
      if (!seen.has(k)) seen.set(k, new Set());
      seen.get(k).add(kind);
    }
  }
  return seen;
}

function report(label, objects, expected) {
  const seen = kinds(objects);
  console.log(`  ${label} fields (${objects.length} sample${objects.length === 1 ? '' : 's'}):`);
  for (const [k, ks] of seen) {
    const tag = expected && !expected.includes(k) ? '   ← not in our list' : '';
    console.log(`    ${k}: ${[...ks].join('|')}${tag}`);
  }
  if (expected) {
    const missing = expected.filter((k) => !seen.has(k));
    if (missing.length) console.log(`    MISSING from the response: ${missing.join(', ')}`);
  }
}

async function call(path, init = {}) {
  const r = await fetch(`${base}/${path}`, { ...init, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  const t = await r.text();
  let body = null;
  try { body = t ? JSON.parse(t) : null; } catch { body = t.slice(0, 200); }
  return { status: r.status, body };
}

const login = await call('api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
if (login.status !== 200) { console.log(`Login failed: HTTP ${login.status}`); process.exit(1); }
const auth = { Authorization: `Bearer ${login.body.token}` };
const { driverId, id: userId } = login.body.user;
console.log(`Signed in. driverId=${driverId} userId=${userId}\n`);

function outcome(path, r) {
  const n = Array.isArray(r.body) ? `${r.body.length} item(s)` : r.body && typeof r.body === 'object' ? 'object' : JSON.stringify(r.body);
  console.log(`GET ${path} → HTTP ${r.status}, ${n}${r.status >= 400 ? ' ' + JSON.stringify(r.body).slice(0, 160) : ''}`);
}

// 1–2. Pickups
const pickups = await call(`api/pickup-requests/driver/${driverId}`, { headers: auth });
outcome(`api/pickup-requests/driver/${driverId}`, pickups);
const pickupList = Array.isArray(pickups.body) ? pickups.body : [];
if (pickupList.length) {
  report('pickup', pickupList, EXPECTED.pickup);
  const senders = pickupList.map((p) => p.sender).filter((s) => s && typeof s === 'object');
  if (senders.length) report('pickup.sender', senders, EXPECTED.pickupSender);
  for (const p of pickupList) {
    console.log(`    - id=${p.id} ${p.requestNumber} status=${p.status} scheduledAt=${p.scheduledAt} estimated=${p.estimatedParcelsCount} city=${mask('pickupCity', p.pickupCity)}`);
  }
  const allParcels = [];
  for (const p of pickupList) {
    const r = await call(`api/pickup-requests/${p.id}/parcels`, { headers: auth });
    outcome(`api/pickup-requests/${p.id}/parcels`, r);
    if (Array.isArray(r.body)) allParcels.push(...r.body);
  }
  if (allParcels.length) {
    report('pickup parcel', allParcels);
    for (const x of allParcels.slice(0, 8)) console.log(`    - ${x.trackingNumber} status=${x.status} price=${x.price} amountToCollect=${x.amountToCollect} deliveryFee=${x.deliveryFee}`);
  }
}

// 3–4. Transfers
console.log('');
const transfers = await call(`api/transfers/driver/${driverId}`, { headers: auth });
outcome(`api/transfers/driver/${driverId}`, transfers);
const transferList = Array.isArray(transfers.body) ? transfers.body : [];
if (transferList.length) {
  report('transfer (list)', transferList, EXPECTED.transfer);
  for (const t of transferList) {
    console.log(`    - id=${t.id} ${t.transferNumber} status=${t.status} type=${t.transferType} parcels=${Array.isArray(t.parcels) ? t.parcels.length : 'absent'} from=${t.fromAgency?.name ?? '-'} to=${t.toAgency?.name ?? '-'}`);
    const d = await call(`api/transfers/${t.id}`, { headers: auth });
    outcome(`api/transfers/${t.id}`, d);
    if (d.body && typeof d.body === 'object' && !Array.isArray(d.body)) {
      const extra = Object.keys(d.body).filter((k) => !(k in t));
      if (extra.length) console.log(`      fields only in the detail: ${extra.join(', ')}`);
      for (const key of ['fromAgency', 'toAgency', 'fromCompany', 'toCompany', 'driver']) {
        if (d.body[key] && typeof d.body[key] === 'object') console.log(`      ${key} keys: ${Object.keys(d.body[key]).join(', ')}`);
      }
      if (Array.isArray(d.body.parcels) && d.body.parcels.length) report('transfer parcel', d.body.parcels);
    }
  }
}

// 5. Returns
console.log('');
const returns = await call(`api/return-management/driver/${driverId}/assigned`, { headers: auth });
outcome(`api/return-management/driver/${driverId}/assigned`, returns);
if (Array.isArray(returns.body) && returns.body.length) report('return parcel', returns.body);

// 6. Notifications — by the USER ACCOUNT id.
console.log('');
for (const q of ['', '?isRead=false', '?isRead=true']) {
  const r = await call(`api/notifications/user/${userId}${q}`, { headers: auth });
  outcome(`api/notifications/user/${userId}${q}`, r);
  if (q === '' && Array.isArray(r.body) && r.body.length) {
    report('notification', r.body, EXPECTED.notification);
    for (const n of r.body.slice(0, 10)) console.log(`    - id=${n.id} type=${n.type} ref=${n.referenceType}:${n.referenceId} isRead=${n.isRead} title=${JSON.stringify(n.title)}`);
  }
}
const unread = await call(`api/notifications/user/${userId}/unread-count`, { headers: auth });
outcome(`api/notifications/user/${userId}/unread-count`, unread);
console.log(`  body: ${JSON.stringify(unread.body)}`);
