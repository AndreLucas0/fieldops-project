package com.codemind.fieldops.evidence.repository;

import com.codemind.fieldops.evidence.domain.Evidence;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EvidenceRepository extends JpaRepository<Evidence, UUID> {

    Optional<Evidence> findByIdempotencyKey(UUID idempotencyKey);

    List<Evidence> findByInspectionId(UUID inspectionId);

    List<Evidence> findByInspectionIdAndResponseId(UUID inspectionId, UUID responseId);

    List<Evidence> findByInspectionIdAndNonConformityId(UUID inspectionId, UUID nonConformityId);

    boolean existsByNonConformityId(UUID nonConformityId);

}
