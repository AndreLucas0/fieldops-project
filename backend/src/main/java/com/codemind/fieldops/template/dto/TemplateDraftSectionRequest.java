package com.codemind.fieldops.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TemplateDraftSectionRequest(
    @NotBlank @Size(max = 150) String title,
    @Size(max = 500) String description) {
}
