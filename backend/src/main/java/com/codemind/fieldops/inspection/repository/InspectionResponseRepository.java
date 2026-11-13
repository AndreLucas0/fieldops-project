package com.codemind.fieldops.inspection.repository;

import com.codemind.fieldops.inspection.domain.Conformity;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

public interface InspectionResponseRepository extends JpaRepository<InspectionResponse, UUID> {

    List<InspectionResponse> findByInspectionId(UUID inspectionId);

    Optional<InspectionResponse> findByInspectionIdAndSnapshotId(UUID inspectionId, UUID snapshotId);

    long countByInspectionIdAndSnapshotIdIn(UUID inspectionId, List<UUID> snapshotIds);

    @Transactional(readOnly = true)
    @Query("""
        SELECT r FROM InspectionResponse r
        JOIN FETCH r.snapshot
        WHERE r.inspection.id = :inspectionId
        AND r.conformity = :conformity
        """)
    List<InspectionResponse> findByInspectionIdAndConformityFetchSnapshot(UUID inspectionId, Conformity conformity);

}
