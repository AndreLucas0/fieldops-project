-- ---------------------------------------------------------------------------
-- BF-005 — incremental template builder backed by a DRAFT version
-- (api-rest.md §12.9; RN-017..RN-020; decisions.md 2026-09-29)
--
-- Sections/items belong to a template version, so the builder writes into a
-- version in DRAFT status. Publishing promotes that version to PUBLISHED.
-- A draft has not been published yet, so published_by/published_at are only
-- mandatory for PUBLISHED versions. Existing rows are all published.
-- ---------------------------------------------------------------------------
ALTER TABLE inspection_template_versions
    ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED'
        CHECK (status IN ('DRAFT', 'PUBLISHED'));

ALTER TABLE inspection_template_versions ALTER COLUMN published_by DROP NOT NULL;
ALTER TABLE inspection_template_versions ALTER COLUMN published_at DROP NOT NULL;
ALTER TABLE inspection_template_versions ALTER COLUMN published_at DROP DEFAULT;

ALTER TABLE inspection_template_versions
    ADD CONSTRAINT chk_template_versions_published_fields
        CHECK (status = 'DRAFT' OR (published_by IS NOT NULL AND published_at IS NOT NULL));

-- A draft can never be used for new inspections
ALTER TABLE inspection_template_versions
    ADD CONSTRAINT chk_template_versions_draft_not_active
        CHECK (status = 'PUBLISHED' OR active_for_new_inspections = FALSE);

-- At most one editable draft per template
CREATE UNIQUE INDEX uq_template_versions_one_draft
    ON inspection_template_versions (template_id)
    WHERE status = 'DRAFT';
