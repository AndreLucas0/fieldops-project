-- ---------------------------------------------------------------------------
-- 10.8 Execução da inspeção
-- ---------------------------------------------------------------------------
CREATE TABLE inspections (
    id                     UUID PRIMARY KEY,
    template_version_id    UUID NOT NULL REFERENCES inspection_template_versions (id),
    client_id              UUID NOT NULL REFERENCES clients (id),
    site_id                UUID NOT NULL REFERENCES inspection_sites (id),
    equipment_id           UUID REFERENCES equipment (id),
    technician_id          UUID NOT NULL REFERENCES users (id),
    supervisor_id          UUID REFERENCES users (id),
    created_by             UUID NOT NULL REFERENCES users (id),
    title                  VARCHAR(200),
    instructions           VARCHAR(1000),
    priority               VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    status                 VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN
                             ('DRAFT','ASSIGNED','IN_PROGRESS','SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','CANCELED')),
    scheduled_for          TIMESTAMPTZ NOT NULL,
    started_at_device      TIMESTAMPTZ,
    started_at_server      TIMESTAMPTZ,
    completed_at_device    TIMESTAMPTZ,
    submitted_at_server    TIMESTAMPTZ,
    approved_at            TIMESTAMPTZ,
    canceled_at            TIMESTAMPTZ,
    canceled_by            UUID REFERENCES users (id),
    canceled_reason        VARCHAR(500),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    version                INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_inspections_tech_status ON inspections (technician_id, status);
CREATE INDEX idx_inspections_supervisor_status ON inspections (supervisor_id, status);
CREATE INDEX idx_inspections_client ON inspections (client_id);
CREATE INDEX idx_inspections_site ON inspections (site_id);
CREATE INDEX idx_inspections_equipment ON inspections (equipment_id);
CREATE INDEX idx_inspections_scheduled ON inspections (scheduled_for);
CREATE INDEX idx_inspections_status_scheduled ON inspections (status, scheduled_for);
