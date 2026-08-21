package com.codemind.fieldops.inspection.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record AssignInspectionRequest(@NotNull UUID technicianId) {
}
