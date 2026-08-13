import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { Session } from '@/domain/auth';

const SESSION_KEY = 'fieldops.session';

/**
 * O SecureStore não existe na web. Ali a sessão fica em memória: some ao
 * recarregar, o que é aceitável porque a web serve apenas para desenvolvimento
 * (o alvo obrigatório é Android — docs/visao-geral.md §1.8).
 */
const memoryStore = new Map<string, string>();
const useSecureStore = Platform.OS !== 'web';

async function readRaw(key: string): Promise<string | null> {
  if (!useSecureStore) return memoryStore.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function writeRaw(key: string, value: string): Promise<void> {
  if (!useSecureStore) {
    memoryStore.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function removeRaw(key: string): Promise<void> {
  if (!useSecureStore) {
    memoryStore.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Guarda mínima contra dado corrompido ou de uma versão anterior do app. */
function parseSession(raw: string): Session | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    if (
      typeof parsed?.accessToken === 'string' &&
      typeof parsed?.refreshToken === 'string' &&
      typeof parsed?.expiresAt === 'number' &&
      parsed.user &&
      typeof parsed.user.id === 'string' &&
      typeof parsed.user.email === 'string'
    ) {
      return parsed as Session;
    }
  } catch {
    // Formato inválido é tratado como ausência de sessão.
  }
  return null;
}

export const sessionStore = {
  async load(): Promise<Session | null> {
    const raw = await readRaw(SESSION_KEY);
    if (!raw) return null;

    const session = parseSession(raw);
    if (!session) {
      await removeRaw(SESSION_KEY);
      return null;
    }
    return session;
  },

  async save(session: Session): Promise<void> {
    await writeRaw(SESSION_KEY, JSON.stringify(session));
  },

  /** AC-AUTH (logout): os dados sensíveis precisam sair do dispositivo. */
  async clear(): Promise<void> {
    await removeRaw(SESSION_KEY);
  },
};
