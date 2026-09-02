package com.codemind.fieldops.review.dto;

import com.codemind.fieldops.review.domain.ReviewDecision;
import java.time.Instant;
import java.util.UUID;

public record InspectionReviewResponse(
    UUID id,
    UUID inspectionId,
    UUID reviewerId,
    ReviewDecision decision,
    String reason,
    String comments,
    Instant reviewedAt,
    int reviewCycle,
    Instant createdAt) {
}
