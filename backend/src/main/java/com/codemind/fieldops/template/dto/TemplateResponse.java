package com.codemind.fieldops.template.dto;

import com.codemind.fieldops.template.domain.TemplateStatus;
import java.time.Instant;
import java.util.UUID;

public record TemplateResponse(
    UUID id,
    String title,
    String description,
    String category,
    TemplateStatus status,
    Integer currentVersion,
    UUID createdById,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
