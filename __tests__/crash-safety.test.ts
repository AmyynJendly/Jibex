/**
 * Crash safety: a screen that breaks shows a message and "Réessayer", never
 * a white screen, and the error is kept on the phone.
 */
import { ERROR_LOG_SIZE, clearErrorLog, describeError, logError, readErrorLog } from '../lib/errorLog';
import fr from '../lib/i18n/fr';

// Node's own modules, without pulling Node's types into the app's type check.
interface Entry { name: string; isDirectory(): boolean }
const fs = require('fs') as {
  readdirSync(dir: string, options: { withFileTypes: true }): Entry[];
  readFileSync(file: string, encoding: 'utf8'): string;
  existsSync(file: string): boolean;
};
const path = require('path') as {
  join(...parts: string[]): string;
  resolve(...parts: string[]): string;
  relative(from: string, to: string): string;
  dirname(file: string): string;
  sep: string;
};

beforeEach(() => {
  (globalThis as unknown as { resetDeviceStorage: () => void }).resetDeviceStorage();
});

function routeFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) routeFiles(full, out);
    else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('an error boundary on every screen', () => {
  const appDir = path.join(process.cwd(), 'app');
  const files = routeFiles(appDir);

  it('finds the app’s routes', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it.each(files.map((file) => [path.relative(appDir, file).split(path.sep).join('/'), file]))(
    '%s exports the shared ErrorBoundary',
    (_name, file) => {
      const source = fs.readFileSync(file as string, 'utf8');
      const match = /export \{ ErrorBoundary \} from '((?:\.\.\/)+)components\/ScreenErrorBoundary';/.exec(source);
      expect(match).not.toBeNull();
      // The relative path really leads to components/ScreenErrorBoundary.tsx.
      const target = path.resolve(path.dirname(file as string), match![1], 'components', 'ScreenErrorBoundary.tsx');
      expect(fs.existsSync(target)).toBe(true);
    }
  );

  it('offers "Réessayer" and a way back, in French', () => {
    expect(fr.common.loadError.retry).toBe('Réessayer');
    expect(fr.common.screenError.title).toBe('Un problème est survenu');
    expect(fr.common.screenError.home).toBe('Retour à l’accueil');
  });
});

describe('the error log on the phone', () => {
  it('keeps when, where and what — newest first', async () => {
    await logError(new TypeError('Cannot read property "id" of undefined'), '/pickups');
    await logError(new Error('second'), '/transfers');
    const log = await readErrorLog();
    expect(log.map((entry) => [entry.where, entry.name, entry.message])).toEqual([
      ['/transfers', 'Error', 'second'],
      ['/pickups', 'TypeError', 'Cannot read property "id" of undefined'],
    ]);
    expect(Number.isNaN(Date.parse(log[0].at))).toBe(false);
  });

  it('keeps only the last 20', async () => {
    for (let i = 0; i < ERROR_LOG_SIZE + 5; i += 1) await logError(new Error('e' + i), '/x');
    const log = await readErrorLog();
    expect(log).toHaveLength(ERROR_LOG_SIZE);
    expect(log[0].message).toBe('e24');
  });

  it('cuts a long message short, and takes anything that was thrown', () => {
    const long = describeError(new Error('x'.repeat(1000)), '/x');
    expect(long.message.length).toBeLessThanOrEqual(301);
    expect(describeError('just a string', '/x')).toMatchObject({ name: 'string', message: 'just a string' });
    expect(describeError(undefined, '/x').message).toBe('undefined');
  });

  it('survives a broken log, and can be cleared', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('jibex.device.errorLog.v1', '{not json');
    expect(await readErrorLog()).toEqual([]);
    await logError(new Error('after'), '/x');
    expect(await readErrorLog()).toHaveLength(1);
    await clearErrorLog();
    expect(await readErrorLog()).toEqual([]);
  });
});
