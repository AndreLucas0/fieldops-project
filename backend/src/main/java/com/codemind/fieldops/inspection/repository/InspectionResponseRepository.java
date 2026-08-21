package com.codemind.fieldops.inspection.repository;

import com.codemind.fieldops.inspection.domain.InspectionResponse;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InspectionResponseRepository extends JpaRepository<InspectionResponse, UUID> {

    List<InspectionResponse> findByInspectionId(UUID inspectionId);

    Optional<InspectionResponse> findByInspectionIdAndSnapshotId(UUID inspectionId, UUID snapshotId);

    long countByInspectionIdAndSnapshotIdIn(UUID inspectionId, List<UUID> snapshotIds);

}
