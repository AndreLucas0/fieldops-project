package com.codemind.fieldops.nonconformity.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record NonConformityUpdateRequest(
    @NotBlank @Size(max = 300) String title,
    @NotBlank String description,
    @NotNull NonConformitySeverity severity) {
}
