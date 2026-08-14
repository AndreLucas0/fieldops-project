-- ---------------------------------------------------------------------------
-- RN-008 — política de invalidação de sessão (Sprint 2, docs/dependencias-
-- spring-initializr.md §7.2 PEND-D01/PEND-B04): tokens (access e refresh)
-- carregam "iat"; qualquer token emitido antes de session_valid_after passa
-- a ser rejeitado. Trocar a senha ou bloquear o usuário atualiza esta coluna
-- para now(), invalidando de uma vez todos os tokens já emitidos, sem
-- precisar de uma tabela própria de refresh tokens.
-- ---------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN session_valid_after TIMESTAMPTZ NOT NULL DEFAULT now();
