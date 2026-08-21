package com.codemind.fieldops.nonconformity.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import java.time.Instant;
import java.util.UUID;

public record NonConformityResponse(
    UUID id,
    UUID inspectionId,
    UUID snapshotId,
    UUID responseId,
    UUID reportedById,
    String title,
    String description,
    NonConformitySeverity severity,
    NonConformityStatus status,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
