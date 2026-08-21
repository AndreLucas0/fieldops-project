package com.codemind.fieldops.inspection.dto;

import com.codemind.fieldops.inspection.domain.InspectionPriority;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record InspectionUpdateRequest(
    @Size(max = 200) String title,
    @Size(max = 1000) String instructions,
    @NotNull InspectionPriority priority,
    @NotNull Instant scheduledFor) {
}
