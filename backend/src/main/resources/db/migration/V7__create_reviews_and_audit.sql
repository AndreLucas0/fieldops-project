-- ---------------------------------------------------------------------------
-- 10.11 Revisão da inspeção
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_reviews (
    id            UUID PRIMARY KEY,
    inspection_id UUID NOT NULL REFERENCES inspections (id),
    reviewer_id   UUID NOT NULL REFERENCES users (id),
    decision      VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
    reason        VARCHAR(1000),
    comments      VARCHAR(1000),
    reviewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    review_cycle  INTEGER NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_inspection ON inspection_reviews (inspection_id);

-- ---------------------------------------------------------------------------
-- 10.12 Auditoria
-- ---------------------------------------------------------------------------
CREATE TABLE audit_events (
    id                    UUID PRIMARY KEY,
    inspection_id         UUID REFERENCES inspections (id),
    actor_id              UUID REFERENCES users (id),
    action                VARCHAR(100) NOT NULL,
    entity_type           VARCHAR(100) NOT NULL,
    entity_id             UUID NOT NULL,
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    device_occurred_at    TIMESTAMPTZ,
    previous_value_json   JSONB,
    new_value_json        JSONB,
    metadata_json         JSONB,
    request_id            VARCHAR(100),
    device_id             VARCHAR(100)
);
CREATE INDEX idx_audit_entity ON audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_inspection ON audit_events (inspection_id);
CREATE INDEX idx_audit_actor ON audit_events (actor_id);
CREATE INDEX idx_audit_occurred_at ON audit_events (occurred_at);
CREATE INDEX idx_audit_request_id ON audit_events (request_id);
