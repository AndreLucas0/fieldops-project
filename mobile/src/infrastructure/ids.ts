import * as Crypto from 'expo-crypto';

/**
 * Identificadores globais em UUID, gerados no dispositivo.
 *
 * docs/modelo-de-dados.md §10.2 exige UUID para todas as entidades
 * sincronizáveis, justamente para que o app crie registros offline sem
 * depender do servidor e possa reenviar operações sem duplicar dados.
 */
export function newId(): string {
  return Crypto.randomUUID();
}
