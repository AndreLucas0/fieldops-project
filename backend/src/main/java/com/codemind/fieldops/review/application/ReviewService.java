package com.codemind.fieldops.review.application;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.review.domain.InspectionReview;
import com.codemind.fieldops.review.domain.ReviewDecision;
import com.codemind.fieldops.review.dto.ApproveInspectionRequest;
import com.codemind.fieldops.review.dto.RejectInspectionRequest;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
import com.codemind.fieldops.shared.audit.AuditEventPublisher;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Closes the inspection lifecycle (M7, roadmap.md) — begin-review, approve
 * and reject, each producing an append-only {@link InspectionReview} row and
 * an {@code AuditEvent} (plano-implementacao-backend.md §9).
 */
@Service
public class ReviewService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String INSPECTION_CANNOT_BEGIN_REVIEW_CODE = "INSPECTION_CANNOT_BEGIN_REVIEW";
    private static final String INSPECTION_NOT_UNDER_REVIEW_CODE = "INSPECTION_NOT_UNDER_REVIEW";

    private final InspectionRepository inspectionRepository;
    private final InspectionReviewRepository inspectionReviewRepository;
    private final UserRepository userRepository;
    private final AuditEventPublisher auditEventPublisher;

    public ReviewService(InspectionRepository inspectionRepository,
            InspectionReviewRepository inspectionReviewRepository, UserRepository userRepository,
            AuditEventPublisher auditEventPublisher) {
        this.inspectionRepository = inspectionRepository;
        this.inspectionReviewRepository = inspectionReviewRepository;
        this.userRepository = userRepository;
        this.auditEventPublisher = auditEventPublisher;
    }

    @Transactional
    public Inspection beginReview(UUID inspectionId, UUID reviewerId) {
        Inspection inspection = getInspection(inspectionId);

        if (inspection.getStatus() != InspectionStatus.SUBMITTED) {
            throw new BusinessRuleViolationException(INSPECTION_CANNOT_BEGIN_REVIEW_CODE,
                "Only SUBMITTED inspections can enter review");
        }

        inspection.setStatus(InspectionStatus.UNDER_REVIEW);
        Inspection saved = inspectionRepository.save(inspection);

        auditEventPublisher.record("REVIEW_STARTED", "INSPECTION", inspectionId, inspectionId, reviewerId, null,
            Map.of("status", InspectionStatus.UNDER_REVIEW.name()), null);

        return saved;
    }

    @Transactional
    public Inspection approve(UUID inspectionId, UUID reviewerId, ApproveInspectionRequest request) {
        Inspection inspection = getInspection(inspectionId);

        if (inspection.getStatus() != InspectionStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(INSPECTION_NOT_UNDER_REVIEW_CODE,
                "Only inspections UNDER_REVIEW can be approved");
        }

        User reviewer = getUser(reviewerId);
        String comments = request != null ? request.comments() : null;
        recordReview(inspection, reviewer, ReviewDecision.APPROVED, null, comments);

        Instant now = Instant.now();
        inspection.setStatus(InspectionStatus.APPROVED);
        inspection.setApprovedAt(now);
        Inspection saved = inspectionRepository.save(inspection);

        auditEventPublisher.record("INSPECTION_APPROVED", "INSPECTION", inspectionId, inspectionId, reviewerId, null,
            Map.of("status", InspectionStatus.APPROVED.name()), comments != null ? Map.of("comments", comments) : null);

        return saved;
    }

    @Transactional
    public Inspection reject(UUID inspectionId, UUID reviewerId, RejectInspectionRequest request) {
        Inspection inspection = getInspection(inspectionId);

        if (inspection.getStatus() != InspectionStatus.UNDER_REVIEW) {
            throw new BusinessRuleViolationException(INSPECTION_NOT_UNDER_REVIEW_CODE,
                "Only inspections UNDER_REVIEW can be rejected");
        }

        User reviewer = getUser(reviewerId);
        recordReview(inspection, reviewer, ReviewDecision.REJECTED, request.reason(), null);

        inspection.setStatus(InspectionStatus.REJECTED);
        Inspection saved = inspectionRepository.save(inspection);

        auditEventPublisher.record("INSPECTION_REJECTED", "INSPECTION", inspectionId, inspectionId, reviewerId, null,
            Map.of("status", InspectionStatus.REJECTED.name()), Map.of("reason", request.reason()));

        return saved;
    }

    @Transactional(readOnly = true)
    public List<InspectionReview> listReviews(UUID inspectionId) {
        getInspection(inspectionId);
        return inspectionReviewRepository.findByInspectionIdOrderByReviewCycleAsc(inspectionId);
    }

    private void recordReview(Inspection inspection, User reviewer, ReviewDecision decision, String reason,
            String comments) {
        int nextCycle = inspectionReviewRepository.countByInspectionId(inspection.getId()) + 1;
        InspectionReview review = InspectionReview.builder()
            .inspection(inspection)
            .reviewer(reviewer)
            .decision(decision)
            .reason(reason)
            .comments(comments)
            .reviewCycle(nextCycle)
            .build();
        inspectionReviewRepository.save(review);
    }

    private Inspection getInspection(UUID id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
    }

    private User getUser(UUID id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));
    }

}
