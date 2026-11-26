package com.codemind.fieldops.shared.audit;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID>, JpaSpecificationExecutor<AuditEvent> {

    Page<AuditEvent> findByInspectionIdOrderByOccurredAtAsc(UUID inspectionId, Pageable pageable);

    Optional<AuditEvent> findFirstByInspectionIdAndActionOrderByOccurredAtDescIdDesc(UUID inspectionId, String action);

}
