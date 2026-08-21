package com.codemind.fieldops.template.dto;

import com.codemind.fieldops.template.domain.ResponseType;
import java.time.Instant;
import java.util.UUID;

public record TemplateItemResponse(
    UUID id,
    String code,
    String title,
    String description,
    ResponseType responseType,
    boolean required,
    boolean observationRequiredOnFailure,
    boolean evidenceRequiredOnFailure,
    String optionsJson,
    int displayOrder,
    Instant createdAt) {
}
