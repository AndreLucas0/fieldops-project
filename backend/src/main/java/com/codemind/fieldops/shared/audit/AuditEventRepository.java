package com.codemind.fieldops.shared.audit;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    Page<AuditEvent> findByInspectionIdOrderByOccurredAtAsc(UUID inspectionId, Pageable pageable);

}
