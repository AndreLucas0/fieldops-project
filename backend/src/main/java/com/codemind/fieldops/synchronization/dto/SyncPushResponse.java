package com.codemind.fieldops.synchronization.dto;

import java.time.Instant;
import java.util.List;

public record SyncPushResponse(
    List<SyncOperationResult> results,
    String nextCursor,
    Instant serverTime) {
}
