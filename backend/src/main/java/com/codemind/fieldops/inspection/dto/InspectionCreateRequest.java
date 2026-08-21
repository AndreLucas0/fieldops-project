package com.codemind.fieldops.inspection.dto;

import com.codemind.fieldops.inspection.domain.InspectionPriority;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record InspectionCreateRequest(
    @NotNull UUID templateVersionId,
    @NotNull UUID clientId,
    @NotNull UUID siteId,
    UUID equipmentId,
    @NotNull UUID technicianId,
    UUID supervisorId,
    @Size(max = 200) String title,
    @Size(max = 1000) String instructions,
    @NotNull InspectionPriority priority,
    @NotNull Instant scheduledFor) {
}
