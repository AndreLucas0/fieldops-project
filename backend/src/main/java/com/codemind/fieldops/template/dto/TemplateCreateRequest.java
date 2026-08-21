package com.codemind.fieldops.template.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TemplateCreateRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 1000) String description,
    @NotBlank @Size(max = 100) String category,
    @Valid List<TemplateSectionRequest> sections) {
}
