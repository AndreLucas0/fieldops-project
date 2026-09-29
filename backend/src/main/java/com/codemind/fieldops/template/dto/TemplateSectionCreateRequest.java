package com.codemind.fieldops.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/** Body of the incremental builder's create/update section routes (openapi TemplateSectionCreateRequest). */
public record TemplateSectionCreateRequest(
    @NotBlank @Size(max = 150) String title,
    @Size(max = 500) String description,
    @NotNull @Positive Integer displayOrder) {
}
