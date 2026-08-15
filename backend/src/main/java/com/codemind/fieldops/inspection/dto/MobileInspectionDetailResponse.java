package com.codemind.fieldops.inspection.dto;

import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MobileInspectionDetailResponse(
    UUID id,
    UUID templateVersionId,
    UUID clientId,
    UUID siteId,
    UUID equipmentId,
    UUID technicianId,
    String title,
    String instructions,
    InspectionPriority priority,
    InspectionStatus status,
    Instant scheduledFor,
    Instant startedAtServer,
    Instant submittedAtServer,
    Instant createdAt,
    Instant updatedAt,
    List<ItemSnapshotDto> snapshots) {
}
