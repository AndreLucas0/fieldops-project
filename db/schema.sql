-- ============================================================================
-- FieldOps — Schema de validação local
-- ============================================================================
-- Este arquivo NÃO é a migração oficial do banco. Ele existe para permitir
-- validar db/seed.sql localmente (via docker-compose) antes que a API tenha
-- migrações Flyway reais.
--
-- Quando o time criar as migrações em `api/src/main/resources/db/migration/`,
-- este arquivo deve ser dividido em versões (V1__create_core_tables.sql,
-- V2__..., etc.) e removido daqui. As tabelas, tipos e restrições abaixo
-- seguem 1:1 o que está descrito em docs/modelo-de-dados.md — nomes de
-- coluna em snake_case, chaves em UUID, enums como CHECK constraints
-- (portáveis entre bancos; troque por tipos ENUM nativos do PostgreSQL se
-- preferir).
--
-- Convenção de nome de tabela: snake_case, plural, exceto entidades cujo
-- nome em português/inglês já é coletivo (equipment, evidence).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 10.6.1 User
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id            UUID PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN','SUPERVISOR','TECHNICIAN','CLIENT_VIEWER')),
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','BLOCKED')),
    phone         VARCHAR(30),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    version       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (email)
);
CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_role ON users (role);

-- ---------------------------------------------------------------------------
-- 10.5.1 Client
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
    id          UUID PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    legal_name  VARCHAR(200),
    document    VARCHAR(30),
    email       VARCHAR(255),
    phone       VARCHAR(30),
    status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    version     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- 10.5.2 InspectionSite
-- ---------------------------------------------------------------------------
CREATE TABLE inspection_sites (
    id            UUID PRIMARY KEY,
    client_id     UUID NOT NULL REFERENCES clients (id),
    name          VARCHAR(150) NOT NULL,
    description   VARCHAR(500),
    address_line  VARCHAR(255),
    city          VARCHAR(100),
    state         VARCHAR(100),
    postal_code   VARCHAR(20),
    latitude      DECIMAL(9,6),
    longitude     DECIMAL(9,6),
    contact_name  VARCHAR(150),
    contact_phone VARCHAR(30),
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    version       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sites_client ON inspection_sites (client_id);

-- ---------------------------------------------------------------------------
-- 10.5.3 Equipment
-- ---------------------------------------------------------------------------
CREATE TABLE equipment (
    id            UUID PRIMARY KEY,
    site_id       UUID NOT NULL REFERENCES inspection_sites (id),
    name          VARCHAR(150) NOT NULL,
    asset_number  VARCHAR(50),
    serial_number VARCHAR(100),
    manufacturer  VARCHAR(150),
    model         VARCHAR(150),
    description   VARCHAR(500),
    qr_code       VARCHAR(100) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','DECOMMISSIONED')),
    installed_at  DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    version       INTEGER NOT NULL DEFAULT 0,
    UNIQUE (qr_code)
);
CREATE INDEX idx_equipment_site ON equipment (site_id);
CREATE INDEX idx_equipment_status ON equipment (status);
CREATE INDEX idx_equipment_asset_number ON equipment (asset_number);

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
