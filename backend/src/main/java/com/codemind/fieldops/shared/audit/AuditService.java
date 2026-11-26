package com.codemind.fieldops.shared.audit;

import com.codemind.fieldops.shared.pagination.PageResponse;
import java.util.Locale;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

    @Transactional(readOnly = true)
    public PageResponse<AuditOverviewEvent> list(String action, UUID inspectionId, Pageable page) {
        Specification<AuditEvent> filter = Specification.unrestricted();
        if (action != null && !action.isBlank()) {
            String normalized = action.trim().toUpperCase(Locale.ROOT);
            filter = filter.and((root, query, builder) -> builder.equal(root.get("action"), normalized));
        }
        if (inspectionId != null) {
            filter = filter.and((root, query, builder) -> builder.equal(root.get("inspectionId"), inspectionId));
        }
        PageRequest ordered = PageRequest.of(page.getPageNumber(), page.getPageSize(),
            Sort.by(Sort.Direction.DESC, "occurredAt", "id"));
        return PageResponse.from(auditEventRepository.findAll(filter, ordered).map(AuditOverviewEvent::from));
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
