package com.codemind.fieldops.inspection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CancelInspectionRequest(@NotBlank @Size(max = 500) String reason) {
}
