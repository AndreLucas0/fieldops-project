/**
 * Testes do backend fictício — cobre apenas comportamentos ausentes de outros
 * arquivos de teste. Integridade do dataset: ver shared-dataset.test.ts.
 */

import { handleMockRequest } from './mock-server';
import { resetMockDatabase } from './mock-data';

const TECHNICIAN_EMAIL = 'tecnico@fieldops.local';
const MOCK_PASSWORD = 'FieldOps@2026';

async function loginAsTechnician(): Promise<string> {
  const response = await handleMockRequest({
    method: 'POST',
    path: '/auth/login',
    query: {},
    body: { email: TECHNICIAN_EMAIL, password: MOCK_PASSWORD },
    formData: null,
  });
  const body = response.body as { accessToken: string };
  return body.accessToken;
}

beforeEach(() => {
  resetMockDatabase();
});

describe('POST /mobile/sync/push', () => {
  it('aplica as operações e devolve APPLIED para cada entrada', async () => {
    const accessToken = await loginAsTechnician();

    const response = await handleMockRequest({
      method: 'POST',
      path: '/mobile/sync/push',
      query: {},
      body: {
        deviceId: 'device-test-001',
        lastPullCursor: null,
        operations: [
          {
            operationId: 'op-001',
            entityType: 'INSPECTION_RESPONSE',
            entityId: 'entity-id-001',
            operationType: 'UPSERT',
            baseVersion: 0,
            payload: { value: 'ok' },
          },
        ],
      },
      accessToken,
      formData: null,
    });

    expect(response.status).toBe(200);
    const body = response.body as { results: { operationId: string; status: string }[] };
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toEqual({ operationId: 'op-001', status: 'APPLIED' });
  });

  it('devolve lista vazia quando não há operações', async () => {
    const accessToken = await loginAsTechnician();

    const response = await handleMockRequest({
      method: 'POST',
      path: '/mobile/sync/push',
      query: {},
      body: {
        deviceId: 'device-test-001',
        lastPullCursor: null,
        operations: [],
      },
      accessToken,
      formData: null,
    });

    expect(response.status).toBe(200);
    const body = response.body as { results: unknown[] };
    expect(body.results).toHaveLength(0);
  });

  it('exige autenticação (sem token retorna 401)', async () => {
    const response = await handleMockRequest({
      method: 'POST',
      path: '/mobile/sync/push',
      query: {},
      body: {
        deviceId: 'device-test-001',
        lastPullCursor: null,
        operations: [],
      },
      formData: null,
    });

    expect(response.status).toBe(401);
  });
});
