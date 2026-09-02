-- ---------------------------------------------------------------------------
-- Sprint 5 — Evidências (10.9). V9 dropped the original `evidence` table
-- (created in V6) while recreating `inspection_responses`/`non_conformities`
-- and never recreated it. This migration recreates it, this time already
-- carrying `idempotency_key` (plano-implementacao-backend.md §4.2, PEND-B02)
-- so `POST /inspections/{id}/evidence` can detect a resend of the same
-- upload (RN-067, RN-068) without a follow-up migration.
-- ---------------------------------------------------------------------------
CREATE TABLE evidence (
    id                    UUID PRIMARY KEY,
    inspection_id         UUID NOT NULL REFERENCES inspections (id),
    response_id           UUID REFERENCES inspection_responses (id),
    non_conformity_id     UUID REFERENCES non_conformities (id),
    idempotency_key       UUID NOT NULL,
    type                  VARCHAR(20) NOT NULL DEFAULT 'PHOTO' CHECK (type IN ('PHOTO')),
    storage_key           VARCHAR(500) NOT NULL,
    original_file_name    VARCHAR(255),
    mime_type             VARCHAR(100) NOT NULL,
    size_bytes            BIGINT NOT NULL,
    checksum              VARCHAR(128),
    description           VARCHAR(500),
    latitude              DECIMAL(9,6),
    longitude             DECIMAL(9,6),
    captured_at_device    TIMESTAMPTZ NOT NULL,
    server_received_at    TIMESTAMPTZ,
    uploaded_at           TIMESTAMPTZ,
    created_by            UUID NOT NULL REFERENCES users (id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_evidence_idempotency_key UNIQUE (idempotency_key)
);
CREATE INDEX idx_evidence_inspection ON evidence (inspection_id);
CREATE INDEX idx_evidence_response ON evidence (response_id);
CREATE INDEX idx_evidence_non_conformity ON evidence (non_conformity_id);
CREATE INDEX idx_evidence_uploaded_at ON evidence (uploaded_at);
