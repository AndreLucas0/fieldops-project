-- Add missing fields to inspection_responses per the mobile contract
-- (contrato-backend-frontend.md §4.2, entities.ts InspectionResponse)
-- V9 dropped these columns when it recreated the table with a different schema.

ALTER TABLE inspection_responses
    ADD COLUMN IF NOT EXISTS conformity        VARCHAR(20)  CHECK (conformity IN ('NOT_APPLICABLE','CONFORMING','NON_CONFORMING')),
    ADD COLUMN IF NOT EXISTS answered_at_device TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ;

-- Add missing fields to non_conformities per the mobile contract
-- (entities.ts NonConformity: createdAtDevice, serverReceivedAt)

ALTER TABLE non_conformities
    ADD COLUMN IF NOT EXISTS created_at_device  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS server_received_at TIMESTAMPTZ;
