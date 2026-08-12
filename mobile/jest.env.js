// Precisa estar definido antes do React ser carregado, por isso vive em
// `setupFiles` e não no setup que roda depois do framework de teste.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
