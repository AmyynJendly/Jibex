import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'jibex.auth.jwt';

/**
 * expo-secure-store has no web implementation (its web module is a stub),
 * so calling it there throws. Fall back to localStorage on web — it's not
 * the security-critical target platform; iOS/Android still use the Keychain
 * / Keystore via SecureStore.
 */
const isWeb = Platform.OS === 'web';

/** Persist the JWT in the Keychain / Android Keystore. */
export async function saveToken(token: string) {
  if (isWeb) {
    localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken() {
  if (isWeb) {
    return localStorage.getItem(TOKEN_KEY);
  }
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  if (isWeb) {
    localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
