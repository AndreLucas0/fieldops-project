package com.codemind.fieldops.shared.audit;

import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/**
 * Single explicit entry point for recording an {@link AuditEvent} — called
 * directly from each {@code application/*Service} that performs a state
 * transition, never via AOP/interceptor, so the caller controls exactly what
 * enters {@code previousValueJson}/{@code newValueJson} (RN-086 requires
 * those to stay free of sensitive data, which a generic interceptor cannot
 * guarantee on its own). Catalogue of {@code action} values:
 * plano-implementacao-backend.md §9.
 */
@Component
public class AuditEventPublisher {

    private final AuditEventRepository auditEventRepository;

    public AuditEventPublisher(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    public void record(String action, String entityType, UUID entityId, UUID inspectionId, UUID actorId,
            Map<String, Object> previousValueJson, Map<String, Object> newValueJson,
            Map<String, Object> metadataJson) {
        AuditEvent event = AuditEvent.builder()
            .action(action)
            .entityType(entityType)
            .entityId(entityId)
            .inspectionId(inspectionId)
            .actorId(actorId)
            .previousValueJson(previousValueJson)
            .newValueJson(newValueJson)
            .metadataJson(metadataJson)
            .build();
        auditEventRepository.save(event);
    }

}
