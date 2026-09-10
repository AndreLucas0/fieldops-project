package com.codemind.fieldops.synchronization.dto;

import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.dto.GeoLocationRequest;
import java.time.Instant;

/**
 * Payload shape agreed for {@code entityType=INSPECTION} operations sent to
 * {@code POST /mobile/sync/push} — the only two supported target statuses
 * are {@code IN_PROGRESS} (equivalent to {@code POST .../start}) and
 * {@code SUBMITTED} (equivalent to {@code POST .../submit}); any other value
 * is rejected.
 */
public record InspectionTransitionSyncPayload(
    InspectionStatus status,
    Instant startedAtDevice,
    Instant completedAtDevice,
    GeoLocationRequest location) {
}
