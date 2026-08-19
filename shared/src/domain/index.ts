/**
 * Contrato de dados do FieldOps em TypeScript, derivado de `openapi.yaml`.
 *
 * Fonte única para o aplicativo (Expo) e a interface administrativa (Angular).
 * Nada aqui pode importar React, Angular ou API de plataforma — é só tipo e
 * função pura, para os dois projetos consumirem o mesmo contrato.
 */

export * from './common';
export * from './enums';
export * from './errors';
export * from './auth';
export * from './entities';
export * from './requests';
