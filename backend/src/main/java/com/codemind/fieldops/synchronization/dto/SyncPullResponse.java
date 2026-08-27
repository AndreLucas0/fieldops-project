package com.codemind.fieldops.synchronization.dto;

import java.time.Instant;
import java.util.List;

public record SyncPullResponse(
    List<SyncChange> changes,
    String nextCursor,
    Instant serverTime) {
}
