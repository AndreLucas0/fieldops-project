package com.codemind.fieldops.template.dto;

import com.codemind.fieldops.template.domain.ResponseType;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record TemplateDraftItemResponse(
    UUID id,
    UUID sectionId,
    String code,
    String title,
    String description,
    ResponseType responseType,
    boolean required,
    boolean observationRequiredOnFailure,
    boolean evidenceRequiredOnFailure,
    JsonNode optionsJson,
    int displayOrder,
    Instant createdAt) {
}
