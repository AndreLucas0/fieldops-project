export const environment = {
  production: false,
  /**
   * Caminho relativo: exige um proxy de desenvolvimento encaminhando `/api/v1`
   * para a API (a API roda no próprio processo, fora do docker-compose deste
   * repositório). Alternativa sem proxy: apontar direto, por exemplo
   * 'http://localhost:8080/api/v1' — nesse caso o CORS da API precisa liberar
   * a origem do `ng serve`.
   */
  apiBaseUrl: '/api/v1',
  /**
   * Backend fictício ligado enquanto a API está sendo construída em paralelo.
   * Usa o mesmo conjunto de dados do aplicativo Expo (`shared/src/mocks`).
   * Desligue para falar com a API real.
   */
  mockApi: true,
};
