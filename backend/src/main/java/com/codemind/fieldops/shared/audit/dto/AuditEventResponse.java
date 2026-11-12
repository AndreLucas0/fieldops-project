package com.codemind.fieldops.shared.audit.dto;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditEventResponse(
    UUID id,
    UUID inspectionId,
    UUID actorId,
    String action,
    String entityType,
    UUID entityId,
    Instant occurredAt,
    Instant deviceOccurredAt,
    Map<String, Object> previousValueJson,
    Map<String, Object> newValueJson,
    Map<String, Object> metadataJson,
    String requestId,
    String deviceId) {
}
