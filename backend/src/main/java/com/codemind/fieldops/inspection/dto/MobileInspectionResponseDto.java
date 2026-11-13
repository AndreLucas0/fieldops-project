package com.codemind.fieldops.inspection.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Mobile-facing projection of InspectionResponse, using the field names
 * defined in contrato-backend-frontend.md §4.2 and entities.ts InspectionResponse.
 * Differs from InspectionResponseDto (which uses internal DB column names).
 */
public record MobileInspectionResponseDto(
    UUID id,
    UUID inspectionId,
    UUID inspectionItemId,
    String valueText,
    BigDecimal valueNumber,
    Boolean valueBoolean,
    LocalDate valueDate,
    String observation,
    String conformity,
    UUID answeredBy,
    Instant answeredAtDevice,
    Instant serverReceivedAt,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
