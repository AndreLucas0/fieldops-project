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
