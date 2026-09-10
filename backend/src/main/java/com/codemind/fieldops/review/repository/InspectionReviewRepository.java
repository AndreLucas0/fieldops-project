package com.codemind.fieldops.review.repository;

import com.codemind.fieldops.review.domain.InspectionReview;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionReviewRepository extends JpaRepository<InspectionReview, UUID> {

    List<InspectionReview> findByInspectionIdOrderByReviewCycleAsc(UUID inspectionId);

    int countByInspectionId(UUID inspectionId);

}
