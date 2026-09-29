ALTER TABLE inspection_item_snapshots
    ADD COLUMN observation_required_on_failure BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN evidence_required_on_failure     BOOLEAN NOT NULL DEFAULT FALSE;
