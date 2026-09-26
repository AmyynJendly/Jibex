/**
 * Logs in to the real server once and prints what the login response
 * actually contains, so it can be checked against what the app expects.
 *
 *   npm run probe:login
 *
 * Reads JIBEX_TEST_USERNAME / JIBEX_TEST_PASSWORD from .env.local (gitignored).
 * Credentials are never printed; the token is shown only as its decoded
 * claims (who it names, its role, when it expires), never the token itself;
 * email and phone are masked.
 */
const base = (process.env.EXPO_PUBLIC_API_BASE_URL || 'https://jibex.cloud/').replace(/\/+$/, '');
const username = process.env.JIBEX_TEST_USERNAME;
const password = process.env.JIBEX_TEST_PASSWORD;

if (!username || !password) {
  console.log('Set JIBEX_TEST_USERNAME and JIBEX_TEST_PASSWORD in .env.local first (see .env.example).');
  process.exit(1);
}

const mask = (value) =>
  typeof value !== 'string' || value.length < 4 ? value : `${value.slice(0, 2)}…${value.slice(-2)}`;

function shape(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  return typeof value;
}

const response = await fetch(`${base}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ username, password }),
});
const body = await response.json().catch(() => null);

console.log(`HTTP ${response.status}`);
if (!body || typeof body !== 'object') {
  console.log('No JSON body.');
  process.exit(0);
}

console.log('\nTop-level fields:');
for (const [key, value] of Object.entries(body)) {
  const shown = key === 'token' ? `<${String(value).length} chars>` : JSON.stringify(value);
  console.log(`  ${key}: ${shape(value)}${key === 'user' ? '' : ` = ${shown}`}`);
}

if (body.user && typeof body.user === 'object') {
  console.log('\nuser fields:');
  for (const [key, value] of Object.entries(body.user)) {
    const shown = key === 'email' || key === 'phone' ? mask(value) : value;
    console.log(`  ${key}: ${shape(value)} = ${JSON.stringify(shown)}`);
  }
}

if (typeof body.token === 'string') {
  const [, payload] = body.token.split('.');
  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    console.log('\nToken claims:', JSON.stringify({ ...claims, sub: mask(claims.sub) }));
    if (claims.iat && claims.exp) {
      console.log(`Token lifetime: ${((claims.exp - claims.iat) / 3600).toFixed(1)} hours`);
    }
  } catch {
    console.log('\nToken is not a readable JWT.');
  }
}
