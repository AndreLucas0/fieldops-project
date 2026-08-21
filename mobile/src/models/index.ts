/**
 * Contrato de dados do FieldOps.
 *
 * As definições vivem em `shared/src/domain`, compartilhadas com a interface
 * administrativa (Angular) — assim o mesmo campo não é declarado duas vezes e
 * não há como as duas aplicações divergirem do `openapi.yaml`.
 *
 * O ponto de importação continua sendo `@/models`, para que nenhuma tela
 * precise saber onde o contrato mora.
 */

export * from '@fieldops/shared/domain';
