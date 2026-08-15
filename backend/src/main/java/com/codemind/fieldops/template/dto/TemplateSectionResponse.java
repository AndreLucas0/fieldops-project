package com.codemind.fieldops.template.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TemplateSectionResponse(
    UUID id,
    String title,
    String description,
    int displayOrder,
    Instant createdAt,
    List<TemplateItemResponse> items) {
}
