/**
 * The real login, against a stand-in server (no network in tests).
 *
 * The login response below is the shape the backend source builds for a
 * driver; the rules are the ones that keep the wrong person out of the app.
 */

// The Keychain, as an in-memory map, so we can see exactly what was stored.
const mockKeychain = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  setItemAsync: async (key: string, value: string) => void mockKeychain.set(key, value),
  getItemAsync: async (key: string) => mockKeychain.get(key) ?? null,
  deleteItemAsync: async (key: string) => void mockKeychain.delete(key),
}));

type RealApi = typeof import('../services/real-api');
type SessionModule = typeof import('../lib/session');

function load(): { api: RealApi; session: SessionModule } {
  let api!: RealApi;
  let session!: SessionModule;
  jest.isolateModules(() => {
    api = require('../services/real-api');
    session = require('../lib/session');
  });
  return { api, session };
}

function reply(status: number, body: unknown) {
  return Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );
}

const DRIVER_LOGIN = {
  token: 'header.payload.signature',
  role: 'DRIVER',
  portal: '/driver',
  user: {
    id: 7,
    driverId: 31,
    username: 'amine.jendli',
    fullName: 'Amine Jendli',
    email: 'amine@example.tn',
    phone: '+216 20 000 000',
    role: 'DRIVER',
    active: true,
    type: 'INTERNAL',
    paymentMode: 'PER_PARCEL',
    companyId: 3,
    companyName: 'Jibex Sousse',
  },
};

let fetchMock: jest.Mock;

beforeEach(() => {
  mockKeychain.clear();
  fetchMock = jest.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

describe('real login', () => {
  it('signs a driver in and keeps both ids in the mockKeychain store', async () => {
    fetchMock.mockReturnValueOnce(reply(200, DRIVER_LOGIN));
    const { api, session } = load();

    const result = await api.login('amine.jendli', 'secret');

    expect(result.success).toBe(true);
    expect(result.user?.name).toBe('Amine Jendli');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://jibex.cloud/api/auth/login');
    expect(JSON.parse(init.body)).toEqual({ username: 'amine.jendli', password: 'secret' });
    expect(init.headers.Authorization).toBeUndefined();

    expect(mockKeychain.get('jibex.auth.jwt')).toBe('header.payload.signature');
    const saved = await session.getSession();
    expect(saved).toMatchObject({ mode: 'real', userId: '7', driverId: '31', companyName: 'Jibex Sousse' });
    expect(saved?.user.driverCode).toBe('DRV-31');
  });

  it('turns away an account that is not a driver, and stores nothing', async () => {
    fetchMock.mockReturnValueOnce(
      reply(200, { ...DRIVER_LOGIN, role: 'AGENCY_ADMIN', user: { ...DRIVER_LOGIN.user, role: 'AGENCY_ADMIN' } })
    );
    const { api } = load();

    const result = await api.login('agent', 'secret');

    expect(result).toEqual({ success: false, error: 'auth.login.errors.notDriver' });
    expect(mockKeychain.size).toBe(0);
  });

  it('reports a wrong password without treating it as an expired session', async () => {
    fetchMock.mockReturnValueOnce(reply(401, { error: "Nom d'utilisateur ou mot de passe incorrect" }));
    const { api, session } = load();
    const expired = jest.fn();
    session.onSessionExpired(expired);

    const result = await api.login('amine.jendli', 'wrong');

    expect(result).toEqual({ success: false, error: 'auth.login.errors.invalidCredentials' });
    expect(expired).not.toHaveBeenCalled();
  });

  it('says the server could not be reached when the network fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
    const { api } = load();

    expect(await api.login('amine.jendli', 'secret')).toEqual({
      success: false,
      error: 'auth.login.errors.network',
    });
  });
});

describe('an expired token', () => {
  it('is sent as a Bearer header, and a 401 signs the driver out', async () => {
    fetchMock.mockReturnValueOnce(reply(200, DRIVER_LOGIN));
    const { api, session } = load();
    await api.login('amine.jendli', 'secret');
    const expired = jest.fn();
    session.onSessionExpired(expired);

    fetchMock.mockReturnValueOnce(reply(401, { error: 'Unauthorized' }));
    await expect(api.request('api/runsheets/driver/31/active')).rejects.toMatchObject({ status: 401 });

    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer header.payload.signature');
    expect(expired).toHaveBeenCalledTimes(1);
    expect(mockKeychain.has('jibex.auth.jwt')).toBe(false);
    expect(await session.getSession()).toBeNull();
  });
});

describe('the enum mapper', () => {
  it('maps the server’s statuses onto ours and back', () => {
    const { api } = load();
    expect(api.toRunsheetStatus('VALIDATED')).toBe('A_CONFIRMER');
    expect(api.toRunsheetStatus('DRIVER_CONFIRMED')).toBe('EN_COURS');
    expect(api.toRunsheetStatus('COMPLETED')).toBe('VALIDE');
    expect(api.toRunsheetStatus('CANCELLED')).toBeNull();
    expect(api.toJobStatus('PENDING_DRIVER_CONFIRMATION')).toBe('PENDING');
    expect(api.fromJobStatus('IN_TRANSIT')).toBe('PENDING');
    expect(api.toTransferStatus('SHIPPED')).toBe('IN_PROGRESS');
    expect(api.toFailureReason('FORCE_MAJEURE')).toBe('FORCE_MAJEURE');
    expect(api.toFailureReason('SOMETHING_NEW')).toBeUndefined();
  });
});
