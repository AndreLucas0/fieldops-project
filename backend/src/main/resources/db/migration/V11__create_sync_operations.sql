-- ---------------------------------------------------------------------------
-- Sprint 6 — Sincronizacao (11.9). Registra cada operationId ja processado
-- por POST /mobile/sync/push para que o reenvio da mesma operacao nunca
-- reaplique a regra de negocio (RN-067, RN-068), conforme
-- plano-implementacao-backend.md §4.2 (PEND-B01).
-- ---------------------------------------------------------------------------
CREATE TABLE sync_operations (
    operation_id          UUID PRIMARY KEY,
    device_id             UUID NOT NULL,
    user_id               UUID NOT NULL REFERENCES users (id),
    entity_type           VARCHAR(30) NOT NULL,
    entity_id             UUID NOT NULL,
    operation_type        VARCHAR(20) NOT NULL,
    status                VARCHAR(20) NOT NULL CHECK (status IN ('APPLIED','REJECTED','CONFLICT','DEPENDENCY_FAILED')),
    result_entity_version INTEGER,
    error_code            VARCHAR(100),
    error_message         VARCHAR(1000),
    processed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sync_operations_device ON sync_operations (device_id);
CREATE INDEX idx_sync_operations_user ON sync_operations (user_id);
