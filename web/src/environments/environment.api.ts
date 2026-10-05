export const environment = {
  production: false,
  /**
   * Desenvolvimento contra a API real (`npm run start:api`). O `ng serve` usa
   * `proxy.conf.json` para encaminhar `/api/v1` ao backend em
   * `http://localhost:8090`, então não é preciso CORS na API.
   */
  apiBaseUrl: '/api/v1',
  /** Sempre desligado nesta configuração: os dados vêm do backend. */
  mockApi: false,
};
