package com.codemind.fieldops.inspection.dto;

import jakarta.validation.constraints.Size;

public record CancelInspectionRequest(@Size(max = 500) String reason) {
}
