package com.codemind.fieldops.nonconformity.dto;

import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record NonConformityCreateRequest(
    @NotBlank @Size(max = 300) String title,
    String description,
    @NotNull NonConformitySeverity severity,
    UUID snapshotId,
    UUID responseId) {
}
