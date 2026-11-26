package com.codemind.fieldops.shared.audit;

import java.time.Instant;
import java.util.UUID;

/** Administrative catalog entry without audit payloads or device metadata. */
public record AuditOverviewEvent(UUID id, UUID inspectionId, UUID actorId, String action,
        String entityType, UUID entityId, Instant occurredAt) {

    public static AuditOverviewEvent from(AuditEvent event) {
        return new AuditOverviewEvent(event.getId(), event.getInspectionId(), event.getActorId(),
            event.getAction(), event.getEntityType(), event.getEntityId(), event.getOccurredAt());
    }

}
