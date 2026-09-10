package com.codemind.fieldops.synchronization.domain;

/**
 * {@code ALREADY_APPLIED} is only ever returned to the client (a resend of an
 * {@code operationId} already recorded as {@code APPLIED}) — it is never
 * persisted in {@code sync_operations} (see the table's CHECK constraint).
 */
public enum SyncOperationStatus {
    APPLIED,
    ALREADY_APPLIED,
    REJECTED,
    CONFLICT,
    DEPENDENCY_FAILED
}
