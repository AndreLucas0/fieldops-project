package com.codemind.fieldops.review.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.review.application.ReviewService;
import com.codemind.fieldops.review.dto.ApproveInspectionRequest;
import com.codemind.fieldops.review.dto.RejectInspectionRequest;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
import com.codemind.fieldops.shared.audit.AuditEventPublisher;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

/**
 * RN-083 ("correcoes apos reprovacao devem preservar historico das versoes
 * anteriores") and RN-085 ("ajustes devem ser diferenciados e auditados") —
 * each review decision must be appended as a new, numbered cycle rather than
 * overwriting the previous one.
 */
class ReviewCycleTest {

    private InspectionRepository inspectionRepository;
    private InspectionReviewRepository inspectionReviewRepository;
    private UserRepository userRepository;
    private AuditEventPublisher auditEventPublisher;
    private ReviewService reviewService;

    private final UUID inspectionId = UUID.randomUUID();
    private final UUID reviewerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        inspectionRepository = mock(InspectionRepository.class);
        inspectionReviewRepository = mock(InspectionReviewRepository.class);
        userRepository = mock(UserRepository.class);
        auditEventPublisher = mock(AuditEventPublisher.class);
        reviewService =
            new ReviewService(inspectionRepository, inspectionReviewRepository, userRepository, auditEventPublisher);

        when(inspectionReviewRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findById(reviewerId)).thenReturn(Optional.of(User.builder().id(reviewerId).build()));
    }

    private Inspection inspectionWithStatus(InspectionStatus status) {
        return Inspection.builder().id(inspectionId).status(status).build();
    }

    @Test
    void firstRejectionOnAnInspectionIsRecordedAsCycleOne() {
        when(inspectionRepository.findById(inspectionId))
            .thenReturn(Optional.of(inspectionWithStatus(InspectionStatus.UNDER_REVIEW)));
        when(inspectionReviewRepository.countByInspectionId(inspectionId)).thenReturn(0);

        reviewService.reject(inspectionId, reviewerId, new RejectInspectionRequest("Missing photo", null));

        ArgumentCaptor<InspectionReview> captor = ArgumentCaptor.forClass(InspectionReview.class);
        verify(inspectionReviewRepository).save(captor.capture());
        assertThat(captor.getValue().getReviewCycle()).isEqualTo(1);
        assertThat(captor.getValue().getDecision()).isEqualTo(ReviewDecision.REJECTED);
        assertThat(captor.getValue().getReason()).isEqualTo("Missing photo");
    }

    @Test
    void approvalAfterAPriorRejectionCycleIsRecordedAsTheNextCycleWithoutTouchingTheFirst() {
        when(inspectionRepository.findById(inspectionId))
            .thenReturn(Optional.of(inspectionWithStatus(InspectionStatus.UNDER_REVIEW)));
        // One rejection already recorded for this inspection (cycle 1).
        when(inspectionReviewRepository.countByInspectionId(inspectionId)).thenReturn(1);

        reviewService.approve(inspectionId, reviewerId, new ApproveInspectionRequest("Looks good now"));

        ArgumentCaptor<InspectionReview> captor = ArgumentCaptor.forClass(InspectionReview.class);
        verify(inspectionReviewRepository).save(captor.capture());
        assertThat(captor.getValue().getReviewCycle()).isEqualTo(2);
        assertThat(captor.getValue().getDecision()).isEqualTo(ReviewDecision.APPROVED);
        // The prior cycle's row is never touched or deleted by this call.
        verify(inspectionReviewRepository, times(1)).save(any());
    }

    @Test
    void rejectingAnInspectionNotUnderReviewIsRejectedWithoutRecordingAReview() {
        when(inspectionRepository.findById(inspectionId))
            .thenReturn(Optional.of(inspectionWithStatus(InspectionStatus.SUBMITTED)));

        assertThatThrownBy(() -> reviewService.reject(inspectionId, reviewerId,
            new RejectInspectionRequest("reason", null)))
            .isInstanceOf(BusinessRuleViolationException.class);

        verify(inspectionReviewRepository, times(0)).save(any());
    }

    @Test
    void approvingAnInspectionNotUnderReviewIsRejectedWithoutRecordingAReview() {
        when(inspectionRepository.findById(inspectionId))
            .thenReturn(Optional.of(inspectionWithStatus(InspectionStatus.IN_PROGRESS)));

        assertThatThrownBy(() -> reviewService.approve(inspectionId, reviewerId, null))
            .isInstanceOf(BusinessRuleViolationException.class);

        verify(inspectionReviewRepository, times(0)).save(any());
    }

    @Test
    void eachReviewRecordsWhichReviewerMadeTheDecision() {
        when(inspectionRepository.findById(inspectionId))
            .thenReturn(Optional.of(inspectionWithStatus(InspectionStatus.UNDER_REVIEW)));
        when(inspectionReviewRepository.countByInspectionId(inspectionId)).thenReturn(0);

        reviewService.approve(inspectionId, reviewerId, null);

        ArgumentCaptor<InspectionReview> captor = ArgumentCaptor.forClass(InspectionReview.class);
        verify(inspectionReviewRepository).save(captor.capture());
        assertThat(captor.getValue().getReviewer().getId()).isEqualTo(reviewerId);
    }

}
