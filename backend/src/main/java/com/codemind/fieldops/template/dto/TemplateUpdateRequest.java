package com.codemind.fieldops.template.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TemplateUpdateRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 1000) String description,
    @NotBlank @Size(max = 100) String category) {
}
