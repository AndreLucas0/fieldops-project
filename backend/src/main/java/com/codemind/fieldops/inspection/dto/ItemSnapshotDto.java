package com.codemind.fieldops.inspection.dto;

import java.time.Instant;
import java.util.UUID;

public record ItemSnapshotDto(
    UUID id,
    UUID inspectionId,
    String sectionTitle,
    Integer sectionOrder,
    String itemCode,
    String itemTitle,
    String itemDescription,
    String responseType,
    Boolean required,
    String optionsJson,
    String rulesJson,
    Integer itemOrder,
    Instant createdAt) {
}
