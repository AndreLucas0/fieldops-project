package com.codemind.fieldops.synchronization.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Payload shape agreed for {@code entityType=INSPECTION_RESPONSE} operations
 * sent to {@code POST /mobile/sync/push} — mirrors
 * {@code InspectionResponseCreateRequest} plus the {@code inspectionId} the
 * generic {@code SyncOperationRequest} envelope does not carry on its own.
 */
public record InspectionResponseSyncPayload(
    UUID inspectionId,
    String valueText,
    BigDecimal valueNumber,
    Boolean valueBoolean,
    LocalDate valueDate,
    String valueChoice,
    String observation) {
}
