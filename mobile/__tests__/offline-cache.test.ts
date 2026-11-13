import { ApiError, CLIENT_ERROR_CODES } from '@/models';
import type { ApiClient } from '@/services/api-client';
import { cachedGet } from '@/services/offline-cache';

/**
 * Leitura offline (aplicativo-mobile.md §13.12 "abrir uma inspeção offline";
 * "SQLite: fonte de dados operacional das inspeções disponíveis offline"):
 * toda leitura bem-sucedida fica guardada; sem rede, a última cópia responde.
 */

function clientReturning(value: unknown) {
  const get = jest.fn(async () => value);
  return { client: { get } as unknown as ApiClient, get };
}

function clientFailingWith(error: unknown) {
  const get = jest.fn(async () => {
    throw error;
  });
  return { client: { get } as unknown as ApiClient, get };
}

const offline = ApiError.client(CLIENT_ERROR_CODES.NETWORK_UNAVAILABLE, 'Sem conexão.');

describe('cachedGet', () => {
  it('com rede, devolve a resposta e a guarda', async () => {
    const online = clientReturning({ id: 'insp-1', title: 'Online' });

    expect(await cachedGet(online.client, '/mobile/inspections/insp-1')).toEqual({
      id: 'insp-1',
      title: 'Online',
    });

    const semRede = clientFailingWith(offline);
    expect(await cachedGet(semRede.client, '/mobile/inspections/insp-1')).toEqual({
      id: 'insp-1',
      title: 'Online',
    });
  });

  it('a chave inclui os parâmetros da consulta', async () => {
    await cachedGet(clientReturning(['pagina-0']).client, '/mobile/inspections', {
      query: { page: 0, size: 100 },
    });

    const semRede = clientFailingWith(offline);
    await expect(
      cachedGet(semRede.client, '/mobile/inspections', { query: { page: 1, size: 100 } }),
    ).rejects.toBe(offline);
    expect(
      await cachedGet(semRede.client, '/mobile/inspections', { query: { page: 0, size: 100 } }),
    ).toEqual(['pagina-0']);
  });

  it('sem rede e sem cópia guardada, repassa o erro de rede', async () => {
    await expect(cachedGet(clientFailingWith(offline).client, '/clients/x')).rejects.toBe(offline);
  });

  it('tempo esgotado também usa a cópia guardada', async () => {
    await cachedGet(clientReturning({ name: 'Cliente' }).client, '/clients/c-1');
    const timeout = ApiError.client(CLIENT_ERROR_CODES.TIMEOUT, 'Demorou.');

    expect(await cachedGet(clientFailingWith(timeout).client, '/clients/c-1')).toEqual({
      name: 'Cliente',
    });
  });

  it('erro do servidor (ex.: 403) não é mascarado pela cópia', async () => {
    await cachedGet(clientReturning({ name: 'Cliente' }).client, '/clients/c-1');
    const forbidden = new ApiError({
      timestamp: '2026-10-20T12:00:00Z',
      status: 403,
      code: 'FORBIDDEN',
      message: 'Sem acesso.',
    });

    await expect(cachedGet(clientFailingWith(forbidden).client, '/clients/c-1')).rejects.toBe(
      forbidden,
    );
  });
});
