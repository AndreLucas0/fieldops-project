package com.codemind.fieldops.template.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TemplateVersionResponse(
    UUID id,
    int versionNumber,
    String titleSnapshot,
    String descriptionSnapshot,
    UUID publishedById,
    Instant publishedAt,
    boolean activeForNewInspections,
    Instant createdAt,
    List<TemplateSectionResponse> sections) {
}
