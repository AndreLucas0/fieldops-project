CREATE TABLE inspection_item_snapshots (
    id                      UUID PRIMARY KEY,
    inspection_id           UUID NOT NULL REFERENCES inspections (id),
    source_template_item_id UUID REFERENCES template_items (id),
    section_title           VARCHAR(150) NOT NULL,
    section_description     VARCHAR(500),
    section_order           INTEGER NOT NULL,
    item_code               VARCHAR(50),
    item_title              VARCHAR(300) NOT NULL,
    item_description        VARCHAR(1000),
    response_type           VARCHAR(20) NOT NULL,
    required                BOOLEAN NOT NULL DEFAULT FALSE,
    rules_json               JSONB,
    options_json             JSONB,
    item_order               INTEGER NOT NULL,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_inspection ON inspection_item_snapshots (inspection_id);
CREATE INDEX idx_snapshots_order ON inspection_item_snapshots (inspection_id, section_order, item_order);

CREATE TABLE inspection_responses (
    id                    UUID PRIMARY KEY,
    inspection_id         UUID NOT NULL REFERENCES inspections (id),
    inspection_item_id    UUID NOT NULL REFERENCES inspection_item_snapshots (id),
    value_text            TEXT,
    value_number          DECIMAL(18,4),
    value_boolean         BOOLEAN,
    value_date            DATE,
    value_json            JSONB,
    observation           VARCHAR(2000),
    conformity            VARCHAR(20) CHECK (conformity IN ('NOT_APPLICABLE','CONFORMING','NON_CONFORMING')),
    answered_by           UUID NOT NULL REFERENCES users (id),
    answered_at_device    TIMESTAMPTZ NOT NULL,
    server_received_at    TIMESTAMPTZ,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                INTEGER NOT NULL DEFAULT 0,
    UNIQUE (inspection_item_id)
);
CREATE INDEX idx_responses_inspection ON inspection_responses (inspection_id);
CREATE INDEX idx_responses_answered_by ON inspection_responses (answered_by);
