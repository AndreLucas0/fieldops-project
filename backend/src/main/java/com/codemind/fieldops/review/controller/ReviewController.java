package com.codemind.fieldops.review.controller;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.review.application.ReviewService;
import com.codemind.fieldops.review.dto.ApproveInspectionRequest;
import com.codemind.fieldops.review.dto.InspectionReviewResponse;
import com.codemind.fieldops.review.dto.RejectInspectionRequest;
import com.codemind.fieldops.review.mapper.InspectionReviewMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * UC-16/UC-17, AC-REVIEW — begin-review/approve/reject are exclusive to the
 * supervisor (plano-implementacao-backend.md §5.3, RN-079).
 */
@RestController
@RequestMapping("/inspections")
public class ReviewController {

    private final ReviewService reviewService;
    private final InspectionMapper inspectionMapper;
    private final InspectionReviewMapper reviewMapper;

    public ReviewController(ReviewService reviewService, InspectionMapper inspectionMapper,
            InspectionReviewMapper reviewMapper) {
        this.reviewService = reviewService;
        this.inspectionMapper = inspectionMapper;
        this.reviewMapper = reviewMapper;
    }

    @PostMapping("/{id}/begin-review")
    @PreAuthorize("hasRole('SUPERVISOR')")
    public InspectionResponse beginReview(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UUID reviewerId = UUID.fromString(jwt.getSubject());
        Inspection inspection = reviewService.beginReview(id, reviewerId);
        return inspectionMapper.toResponse(inspection);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('SUPERVISOR')")
    public InspectionResponse approve(@PathVariable UUID id,
            @RequestBody(required = false) ApproveInspectionRequest request, @AuthenticationPrincipal Jwt jwt) {
        UUID reviewerId = UUID.fromString(jwt.getSubject());
        Inspection inspection = reviewService.approve(id, reviewerId, request);
        return inspectionMapper.toResponse(inspection);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('SUPERVISOR')")
    public InspectionResponse reject(@PathVariable UUID id, @Valid @RequestBody RejectInspectionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        UUID reviewerId = UUID.fromString(jwt.getSubject());
        Inspection inspection = reviewService.reject(id, reviewerId, request);
        return inspectionMapper.toResponse(inspection);
    }

    @GetMapping("/{id}/reviews")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<InspectionReviewResponse> listReviews(@PathVariable UUID id) {
        return reviewService.listReviews(id).stream().map(reviewMapper::toResponse).toList();
    }

}
