-- ---------------------------------------------------------------------------
-- 10.9 Evidências
-- ---------------------------------------------------------------------------
CREATE TABLE evidence (
    id                    UUID PRIMARY KEY,
    inspection_id         UUID NOT NULL REFERENCES inspections (id),
    response_id           UUID REFERENCES inspection_responses (id),
    non_conformity_id     UUID,  -- FK adicionada após a criação de non_conformities (ver abaixo)
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
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_inspection ON evidence (inspection_id);
CREATE INDEX idx_evidence_response ON evidence (response_id);
CREATE INDEX idx_evidence_non_conformity ON evidence (non_conformity_id);
CREATE INDEX idx_evidence_uploaded_at ON evidence (uploaded_at);

-- ---------------------------------------------------------------------------
-- 10.10 Não conformidades
-- ---------------------------------------------------------------------------
CREATE TABLE non_conformities (
    id                    UUID PRIMARY KEY,
    inspection_id         UUID NOT NULL REFERENCES inspections (id),
    inspection_item_id    UUID REFERENCES inspection_item_snapshots (id),
    response_id           UUID REFERENCES inspection_responses (id),
    title                 VARCHAR(200) NOT NULL,
    description           VARCHAR(2000) NOT NULL,
    severity              VARCHAR(20) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status                VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN')),
    created_by            UUID NOT NULL REFERENCES users (id),
    created_at_device     TIMESTAMPTZ NOT NULL,
    server_received_at    TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    version               INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_nc_inspection ON non_conformities (inspection_id);
CREATE INDEX idx_nc_severity ON non_conformities (severity);
CREATE INDEX idx_nc_status ON non_conformities (status);

ALTER TABLE evidence
    ADD CONSTRAINT fk_evidence_non_conformity
    FOREIGN KEY (non_conformity_id) REFERENCES non_conformities (id);
