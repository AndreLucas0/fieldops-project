package com.codemind.fieldops.shared.audit;

import com.codemind.fieldops.shared.pagination.PageResponse;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditEventDto> getInspectionHistory(UUID inspectionId, Pageable pageable) {
        Page<AuditEvent> events = auditEventRepository
            .findByInspectionIdOrderByOccurredAtAsc(inspectionId, pageable);
        return PageResponse.from(events.map(this::toDto));
    }

    private AuditEventDto toDto(AuditEvent e) {
        return new AuditEventDto(
            e.getId(), e.getInspectionId(), e.getActorId(),
            e.getAction(), e.getEntityType(), e.getEntityId(),
            e.getOccurredAt(), e.getDeviceOccurredAt(),
            e.getPreviousValueJson(), e.getNewValueJson(), e.getMetadataJson(),
            e.getRequestId(), e.getDeviceId());
    }
}
