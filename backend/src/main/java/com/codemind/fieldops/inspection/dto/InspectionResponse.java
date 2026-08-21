package com.codemind.fieldops.inspection.dto;

import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import java.time.Instant;
import java.util.UUID;

public record InspectionResponse(
    UUID id,
    UUID templateVersionId,
    UUID clientId,
    UUID siteId,
    UUID equipmentId,
    UUID technicianId,
    UUID supervisorId,
    UUID createdById,
    String title,
    String instructions,
    InspectionPriority priority,
    InspectionStatus status,
    Instant scheduledFor,
    Instant startedAtDevice,
    Instant startedAtServer,
    Instant completedAtDevice,
    Instant submittedAtServer,
    Instant approvedAt,
    Instant canceledAt,
    String canceledReason,
    Instant createdAt,
    Instant updatedAt,
    int version) {
}
