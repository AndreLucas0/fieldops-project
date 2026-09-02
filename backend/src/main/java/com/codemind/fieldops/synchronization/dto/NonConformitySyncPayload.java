package com.codemind.fieldops.synchronization.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import java.util.UUID;

/**
 * Payload shape agreed for {@code entityType=NON_CONFORMITY} operations sent
 * to {@code POST /mobile/sync/push} — mirrors
 * {@code NonConformityCreateRequest} plus the {@code inspectionId} the
 * generic {@code SyncOperationRequest} envelope does not carry on its own.
 */
public record NonConformitySyncPayload(
    UUID inspectionId,
    String title,
    String description,
    NonConformitySeverity severity,
    UUID snapshotId,
    UUID responseId) {
}
