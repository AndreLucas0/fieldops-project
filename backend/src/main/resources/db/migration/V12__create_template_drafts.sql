CREATE TABLE template_draft_sections (
    id              UUID PRIMARY KEY,
    template_id     UUID NOT NULL REFERENCES inspection_templates (id) ON DELETE CASCADE,
    title           VARCHAR(150) NOT NULL,
    description     VARCHAR(500),
    display_order   INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_draft_sections_template_order
    ON template_draft_sections (template_id, display_order);

CREATE TABLE template_draft_items (
    id                                UUID PRIMARY KEY,
    section_id                        UUID NOT NULL REFERENCES template_draft_sections (id) ON DELETE CASCADE,
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
    created_at                        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_draft_items_section_order
    ON template_draft_items (section_id, display_order);
