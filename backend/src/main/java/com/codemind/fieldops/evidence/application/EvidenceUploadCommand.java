package com.codemind.fieldops.evidence.application;

import com.codemind.fieldops.evidence.domain.EvidenceType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record EvidenceUploadCommand(
    UUID idempotencyKey,
    UUID responseId,
    UUID nonConformityId,
    EvidenceType type,
    String description,
    Instant capturedAtDevice,
    BigDecimal latitude,
    BigDecimal longitude) {
}
