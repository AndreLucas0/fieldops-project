-- Drop dependent tables first
DROP TABLE IF EXISTS evidence CASCADE;

-- Update inspection_responses table to match Sprint 4 schema
-- Drop old table and recreate with proper columns
DROP TABLE IF EXISTS inspection_responses CASCADE;

CREATE TABLE inspection_responses (
    id                      UUID PRIMARY KEY,
    inspection_id           UUID NOT NULL REFERENCES inspections (id),
    snapshot_id             UUID NOT NULL REFERENCES inspection_item_snapshots (id),
    responded_by            UUID NOT NULL REFERENCES users (id),
    value_text              TEXT,
    value_number            DECIMAL(15,4),
    value_boolean           BOOLEAN,
    value_date              DATE,
    value_choice            VARCHAR(200),
    observation             TEXT,
    responded_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                 INTEGER NOT NULL DEFAULT 0,
    UNIQUE (inspection_id, snapshot_id)
);

CREATE INDEX idx_responses_v2_inspection ON inspection_responses (inspection_id);
CREATE INDEX idx_responses_v2_snapshot ON inspection_responses (snapshot_id);
CREATE INDEX idx_responses_v2_responded_by ON inspection_responses (responded_by);

-- Update non_conformities table to match Sprint 4 schema
DROP TABLE IF EXISTS non_conformities CASCADE;

CREATE TABLE non_conformities (
    id              UUID PRIMARY KEY,
    inspection_id   UUID NOT NULL REFERENCES inspections (id),
    snapshot_id     UUID REFERENCES inspection_item_snapshots (id),
    response_id     UUID REFERENCES inspection_responses (id),
    reported_by     UUID NOT NULL REFERENCES users (id),
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    severity        VARCHAR(20) NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status          VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_PROGRESS','RESOLVED','DISMISSED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_nc_v2_inspection ON non_conformities (inspection_id);
CREATE INDEX idx_nc_v2_severity ON non_conformities (severity);
CREATE INDEX idx_nc_v2_status ON non_conformities (status);
