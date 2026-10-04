/**
 * A stand-in for the phone's storage that outlives module reloads.
 *
 * The tests reload `mock-api` fresh for each case (`jest.isolateModules`),
 * which is exactly what an app restart does to in-memory state. Keeping this
 * store on `globalThis` means what one "launch" saved is still there for the
 * next, so restart behaviour can be tested for real; `resetDeviceStorage`
 * wipes it between tests.
 */
const store: Map<string, string> = ((globalThis as { __deviceStorage?: Map<string, string> }).__deviceStorage ??=
  new Map());

jest.mock('@react-native-async-storage/async-storage', () => {
  const shared = (globalThis as unknown as { __deviceStorage: Map<string, string> }).__deviceStorage;
  const api = {
    getItem: async (key: string) => shared.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      shared.set(key, value);
    },
    removeItem: async (key: string) => {
      shared.delete(key);
    },
    multiGet: async (keys: string[]) => keys.map((key) => [key, shared.get(key) ?? null]),
    clear: async () => shared.clear(),
  };
  return { __esModule: true, default: api, ...api };
});

(globalThis as { resetDeviceStorage?: () => void }).resetDeviceStorage = () => store.clear();
