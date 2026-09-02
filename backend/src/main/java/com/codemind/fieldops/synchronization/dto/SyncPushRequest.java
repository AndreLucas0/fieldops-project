package com.codemind.fieldops.synchronization.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

public record SyncPushRequest(
    @NotNull UUID deviceId,
    String lastPullCursor,
    @NotEmpty List<SyncOperationRequest> operations) {
}
