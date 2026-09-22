package com.codemind.fieldops.nonconformity.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * Mobile-facing projection of NonConformity, using the field names
 * defined in contrato-backend-frontend.md and entities.ts NonConformity.
 * Uses inspectionItemId/createdBy instead of internal snapshotId/reportedById.
 */
public record MobileNonConformityDto(
    UUID id,
    UUID inspectionId,
    UUID inspectionItemId,
    UUID responseId,
    String title,
    String description,
    NonConformitySeverity severity,
    NonConformityStatus status,
    UUID createdBy,
    Instant createdAtDevice,
    Instant serverReceivedAt,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
