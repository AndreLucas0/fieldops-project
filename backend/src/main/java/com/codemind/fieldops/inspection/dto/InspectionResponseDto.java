package com.codemind.fieldops.inspection.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InspectionResponseDto(
    UUID id,
    UUID inspectionId,
    UUID snapshotId,
    UUID respondedById,
    String valueText,
    BigDecimal valueNumber,
    Boolean valueBoolean,
    LocalDate valueDate,
    String valueChoice,
    String observation,
    Instant respondedAt,
    Instant updatedAt,
    int version) {
}
