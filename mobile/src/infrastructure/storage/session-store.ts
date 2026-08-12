import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Persistência da sessão.
 *
 * docs/arquitetura.md §11.10 exige que o token fique em armazenamento seguro
 * no dispositivo. O SecureStore não existe no target web, então lá caímos para
 * o localStorage — que serve ao desenvolvimento, não a um ambiente publicado.
 */

const SESSION_KEY = 'fieldops.session';

export interface Session {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'ADMIN' | 'SUPERVISOR' | 'TECHNICIAN' | 'CLIENT_VIEWER';
  };
}

const isWeb = Platform.OS === 'web';

async function setItem(key: string, value: string) {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveSession(session: Session) {
  await setItem(SESSION_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<Session | null> {
  const raw = await getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    // Sessão corrompida não deve travar a abertura do app.
    await removeItem(SESSION_KEY);
    return null;
  }
}

export async function clearSession() {
  await removeItem(SESSION_KEY);
}
