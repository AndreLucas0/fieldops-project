package com.codemind.fieldops.evidence.dto;

import com.codemind.fieldops.evidence.domain.EvidenceType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EvidenceResponse(
    UUID id,
    UUID inspectionId,
    UUID responseId,
    UUID nonConformityId,
    EvidenceType type,
    String storageKey,
    String accessUrl,
    String mimeType,
    long sizeBytes,
    String checksum,
    String description,
    BigDecimal latitude,
    BigDecimal longitude,
    Instant capturedAtDevice,
    Instant serverReceivedAt,
    Instant uploadedAt,
    UUID createdBy,
    Instant createdAt) {
}
