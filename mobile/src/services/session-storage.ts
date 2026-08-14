/**
 * Guarda da sessão no armazenamento seguro do aparelho.
 *
 * Usa a mesma chave e o mesmo formato de `features/auth/session-store`, de
 * modo que as duas leituras sempre enxerguem a mesma sessão gravada.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import type { AuthSession } from '@/models';

export const SESSION_KEY = 'fieldops.session';

/**
 * O Secure Store não existe na web (SDK 57). Ali a sessão fica em memória e
 * some ao recarregar — aceitável porque a web serve só para desenvolvimento; o
 * alvo obrigatório é Android (docs/visao-geral.md §1.8).
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

/** Guarda contra dado corrompido ou gravado por uma versão anterior do app. */
function parseSession(raw: string): AuthSession | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AuthSession>;
    if (
      typeof parsed?.accessToken === 'string' &&
      typeof parsed?.refreshToken === 'string' &&
      typeof parsed?.expiresAt === 'number' &&
      parsed.user &&
      typeof parsed.user.id === 'string' &&
      typeof parsed.user.email === 'string'
    ) {
      return parsed as AuthSession;
    }
  } catch {
    // Formato inválido é tratado como ausência de sessão.
  }
  return null;
}

export const sessionStorage = {
  async load(): Promise<AuthSession | null> {
    const raw = await readRaw(SESSION_KEY);
    if (!raw) return null;

    const session = parseSession(raw);
    // Conteúdo ilegível é apagado: manter lixo só faria o app falhar de novo.
    if (!session) {
      await removeRaw(SESSION_KEY);
      return null;
    }
    return session;
  },

  async save(session: AuthSession): Promise<void> {
    await writeRaw(SESSION_KEY, JSON.stringify(session));
  },

  /** AC-AUTH (logout): os dados sensíveis precisam sair do dispositivo. */
  async clear(): Promise<void> {
    await removeRaw(SESSION_KEY);
  },
};

export type SessionStorage = typeof sessionStorage;
