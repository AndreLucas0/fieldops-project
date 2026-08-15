package com.codemind.fieldops.template.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TemplateSectionRequest(
    @NotBlank @Size(max = 150) String title,
    @Size(max = 500) String description,
    @NotNull @Positive Integer displayOrder,
    @Valid List<TemplateItemRequest> items) {
}
