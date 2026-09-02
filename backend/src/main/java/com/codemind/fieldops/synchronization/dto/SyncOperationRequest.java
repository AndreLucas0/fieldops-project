package com.codemind.fieldops.synchronization.dto;

import com.codemind.fieldops.synchronization.domain.SyncEntityType;
import com.codemind.fieldops.synchronization.domain.SyncOperationType;
import jakarta.validation.constraints.NotNull;
import java.util.Map;
import java.util.UUID;

public record SyncOperationRequest(
    @NotNull UUID operationId,
    @NotNull SyncEntityType entityType,
    @NotNull UUID entityId,
    @NotNull SyncOperationType operationType,
    Integer baseVersion,
    @NotNull Map<String, Object> payload) {
}
