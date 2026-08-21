/**
 * Camada de acesso a dados do FieldOps.
 *
 * Ponto de importação recomendado: `import { apiClient, useAuth } from
 * '@/services'`. Toda chamada vai direto à API — ou ao backend fictício do
 * modo mock, conforme `EXPO_PUBLIC_API_MOCK`. Não há banco local, fila de
 * envio nem motor de sincronização.
 */

export {
  ApiClient,
  apiClient,
  buildQueryString,
  type ApiClientOptions,
  type HttpMethod,
  type HttpResponse,
  type MockHandler,
  type MockRequest,
  type QueryParams,
  type QueryValue,
  type RequestOptions,
} from './api-client';

export {
  AuthService,
  authService,
  toAuthErrorCode,
  useAuth,
  type AuthNavigation,
  type AuthServiceOptions,
  type AuthState,
  type AuthStatus,
} from './auth-service';

export {
  configureApi,
  getApiConfig,
  resetApiConfig,
  resolveUrl,
  type ApiConfig,
} from './config';

export { SESSION_KEY, sessionStorage, type SessionStorage } from './session-storage';

export {
  createMockDatabase,
  getMockDatabase,
  resetMockDatabase,
  MOCK_PASSWORDS,
  type MockAccount,
  type MockDatabase,
} from './mock/mock-data';

export { handleMockRequest } from './mock/mock-server';
