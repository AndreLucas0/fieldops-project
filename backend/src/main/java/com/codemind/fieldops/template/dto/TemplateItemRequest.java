package com.codemind.fieldops.template.dto;

import com.codemind.fieldops.template.domain.ResponseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TemplateItemRequest(
    @Size(max = 50) String code,
    @NotBlank @Size(max = 300) String title,
    @Size(max = 1000) String description,
    @NotNull ResponseType responseType,
    Boolean required,
    Boolean observationRequiredOnFailure,
    Boolean evidenceRequiredOnFailure,
    String optionsJson,
    @NotNull @Positive Integer displayOrder) {
}
