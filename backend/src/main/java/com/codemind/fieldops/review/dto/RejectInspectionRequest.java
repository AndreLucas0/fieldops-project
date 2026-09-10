package com.codemind.fieldops.review.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import java.util.UUID;

/**
 * RN-080 — rejection must carry a reason; {@code @NotBlank} makes an empty
 * or absent {@code reason} fail Bean Validation, which
 * {@code GlobalExceptionHandler} maps to {@code 400} (AC-REVIEW).
 */
public record RejectInspectionRequest(
    @NotBlank String reason,
    List<UUID> itemsToCorrect) {
}
