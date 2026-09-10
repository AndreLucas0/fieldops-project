package com.codemind.fieldops.synchronization.dto;

import com.codemind.fieldops.synchronization.domain.SyncOperationStatus;
import java.util.UUID;

public record SyncOperationResult(
    UUID operationId,
    SyncOperationStatus status,
    Integer entityVersion,
    SyncOperationError error) {

    public record SyncOperationError(String code, String message) {
    }

}
