package com.codemind.fieldops.shared.audit.application;

import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.shared.audit.AuditEvent;
import com.codemind.fieldops.shared.audit.AuditEventRepository;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionHistoryService {

    private final InspectionRepository inspectionRepository;
    private final AuditEventRepository auditEventRepository;

    public InspectionHistoryService(InspectionRepository inspectionRepository,
            AuditEventRepository auditEventRepository) {
        this.inspectionRepository = inspectionRepository;
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(readOnly = true)
    public Page<AuditEvent> list(UUID inspectionId, Pageable pageable) {
        if (!inspectionRepository.existsById(inspectionId)) {
            throw new ResourceNotFoundException("INSPECTION_NOT_FOUND", "Inspection not found");
        }
        return auditEventRepository.findByInspectionIdOrderByOccurredAtAsc(inspectionId, pageable);
    }

}
