-- ---------------------------------------------------------------------------
-- 10.7.1 – 10.7.4 Modelos de inspeção
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_templates (
    id              UUID PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     VARCHAR(1000),
    category        VARCHAR(100) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','INACTIVE')),
    current_version INTEGER,
    created_by      UUID NOT NULL REFERENCES users (id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    version         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE inspection_template_versions (
    id                          UUID PRIMARY KEY,
    template_id                 UUID NOT NULL REFERENCES inspection_templates (id),
    version_number              INTEGER NOT NULL,
    title_snapshot              VARCHAR(200) NOT NULL,
    description_snapshot        VARCHAR(1000),
    published_by                UUID NOT NULL REFERENCES users (id),
    published_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    active_for_new_inspections  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_id, version_number)
);

CREATE TABLE template_sections (
    id                    UUID PRIMARY KEY,
    template_version_id   UUID NOT NULL REFERENCES inspection_template_versions (id),
    title                 VARCHAR(150) NOT NULL,
    description           VARCHAR(500),
    display_order         INTEGER NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (template_version_id, display_order)
);
CREATE INDEX idx_sections_version ON template_sections (template_version_id);

CREATE TABLE template_items (
    id                                UUID PRIMARY KEY,
    section_id                        UUID NOT NULL REFERENCES template_sections (id),
    code                              VARCHAR(50),
    title                             VARCHAR(300) NOT NULL,
    description                       VARCHAR(1000),
    response_type                     VARCHAR(20) NOT NULL CHECK (response_type IN
                                        ('TEXT_SHORT','TEXT_LONG','NUMBER','BOOLEAN','CONFORMITY','SINGLE_CHOICE','DATE')),
    required                          BOOLEAN NOT NULL DEFAULT FALSE,
    observation_required_on_failure   BOOLEAN NOT NULL DEFAULT FALSE,
    evidence_required_on_failure      BOOLEAN NOT NULL DEFAULT FALSE,
    options_json                      JSONB,
    display_order                     INTEGER NOT NULL,
    created_at                        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (section_id, display_order)
);
CREATE INDEX idx_items_section ON template_items (section_id);
