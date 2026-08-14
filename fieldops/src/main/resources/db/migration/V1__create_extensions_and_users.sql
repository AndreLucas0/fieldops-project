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
