package com.codemind.fieldops.inspection.dto;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record ItemSnapshotDto(
    UUID id,
    UUID inspectionId,
    UUID sourceTemplateItemId,
    String sectionTitle,
    String sectionDescription,
    Integer sectionOrder,
    String itemCode,
    String itemTitle,
    String itemDescription,
    String responseType,
    Boolean required,
    JsonNode optionsJson,
    String rulesJson,
    Integer itemOrder,
    Instant createdAt) {
}
