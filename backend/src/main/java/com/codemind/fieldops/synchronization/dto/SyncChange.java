package com.codemind.fieldops.synchronization.dto;

import com.codemind.fieldops.synchronization.domain.SyncEntityType;
import com.codemind.fieldops.synchronization.domain.SyncOperationType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SyncChange(
    SyncEntityType entityType,
    UUID entityId,
    SyncOperationType operationType,
    Map<String, Object> payload,
    int version,
    Instant occurredAt) {
}
