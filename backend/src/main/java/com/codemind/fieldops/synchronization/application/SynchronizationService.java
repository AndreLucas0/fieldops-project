package com.codemind.fieldops.synchronization.application;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.dto.InspectionResponseCreateRequest;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.dto.NonConformityCreateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityUpdateRequest;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.nonconformity.application.NonConformityService;
import com.codemind.fieldops.synchronization.domain.SyncEntityType;
import com.codemind.fieldops.synchronization.domain.SyncOperation;
import com.codemind.fieldops.synchronization.domain.SyncOperationStatus;
import com.codemind.fieldops.synchronization.domain.SyncOperationType;
import com.codemind.fieldops.synchronization.dto.InspectionResponseSyncPayload;
import com.codemind.fieldops.synchronization.dto.InspectionTransitionSyncPayload;
import com.codemind.fieldops.synchronization.dto.NonConformitySyncPayload;
import com.codemind.fieldops.synchronization.dto.SyncChange;
import com.codemind.fieldops.synchronization.dto.SyncOperationRequest;
import com.codemind.fieldops.synchronization.dto.SyncOperationResult;
import com.codemind.fieldops.synchronization.dto.SyncOperationResult.SyncOperationError;
import com.codemind.fieldops.synchronization.dto.SyncPullResponse;
import com.codemind.fieldops.synchronization.dto.SyncPushRequest;
import com.codemind.fieldops.synchronization.dto.SyncPushResponse;
import com.codemind.fieldops.synchronization.repository.SyncOperationRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implements the push/pull synchronization contract designed in
 * plano-implementacao-backend.md §12. Payload contract for each
 * {@link SyncEntityType} (not fully pinned down by openapi.yaml, which
 * declares {@code payload} as free-form {@code additionalProperties: true}
 * — the concrete shape is a decision of this implementation, documented on
 * each {@code *SyncPayload} record):
 * <ul>
 *   <li>{@code INSPECTION} — {@link InspectionTransitionSyncPayload}, entityId = inspection id.</li>
 *   <li>{@code INSPECTION_RESPONSE} — {@link InspectionResponseSyncPayload}, entityId = snapshot id
 *       (matches the natural upsert key already used by {@code PUT /inspections/{id}/responses/{snapshotId}}).</li>
 *   <li>{@code NON_CONFORMITY} — {@link NonConformitySyncPayload}, entityId = client-generated id
 *       (accepted verbatim so a later pull recognizes the record created offline).</li>
 *   <li>{@code EVIDENCE} — never accepted here; evidence always travels through the multipart
 *       upload endpoint (RN-078).</li>
 * </ul>
 */
@Service
public class SynchronizationService {

    private static final String UNSUPPORTED_ENTITY_TYPE_CODE = "SYNC_UNSUPPORTED_ENTITY_TYPE";
    private static final String EVIDENCE_NOT_SUPPORTED_CODE = "SYNC_EVIDENCE_NOT_SUPPORTED";
    private static final String DELETE_NOT_SUPPORTED_CODE = "SYNC_DELETE_NOT_SUPPORTED";
    private static final String INVALID_PAYLOAD_CODE = "SYNC_INVALID_PAYLOAD";
    private static final String UNSUPPORTED_TRANSITION_CODE = "SYNC_UNSUPPORTED_INSPECTION_TRANSITION";
    private static final String NOT_OWNER_CODE = "SYNC_INSPECTION_NOT_OWNED";
    private static final String ENTITY_ID_MISMATCH_CODE = "SYNC_ENTITY_ID_MISMATCH";
    private static final String VERSION_CONFLICT_CODE = "SYNC_VERSION_CONFLICT";

    private static final int PULL_PAGE_LIMIT = 500;

    private final SyncOperationRepository syncOperationRepository;
    private final InspectionRepository inspectionRepository;
    private final InspectionResponseRepository inspectionResponseRepository;
    private final NonConformityRepository nonConformityRepository;
    private final InspectionExecutionService inspectionExecutionService;
    private final NonConformityService nonConformityService;
    // Built locally rather than injected: this project's Spring Boot
    // autoconfiguration does not expose a classic com.fasterxml.jackson.databind.ObjectMapper
    // bean (the web stack's HTTP message conversion uses a different Jackson
    // entry point), so relying on @Autowired here left the bean
    // unresolvable at context startup. A local, JavaTimeModule-equipped
    // instance is sufficient for converting the free-form sync payload map
    // into the typed *SyncPayload records below and keeps this service
    // independent of that autoconfiguration detail.
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    private final SynchronizationService self;

    public SynchronizationService(SyncOperationRepository syncOperationRepository,
            InspectionRepository inspectionRepository, InspectionResponseRepository inspectionResponseRepository,
            NonConformityRepository nonConformityRepository, InspectionExecutionService inspectionExecutionService,
            NonConformityService nonConformityService,
            @Lazy SynchronizationService self) {
        this.syncOperationRepository = syncOperationRepository;
        this.inspectionRepository = inspectionRepository;
        this.inspectionResponseRepository = inspectionResponseRepository;
        this.nonConformityRepository = nonConformityRepository;
        this.inspectionExecutionService = inspectionExecutionService;
        this.nonConformityService = nonConformityService;
        // Self-injection (via a lazy proxy, to avoid a circular creation
        // error) so each operation runs in its own REQUIRES_NEW transaction
        // (RN-070 — one failing operation must not roll back the others
        // already applied in the same batch).
        this.self = self;
    }

    @Transactional(readOnly = true)
    public SyncPushResponse push(UUID userId, SyncPushRequest request) {
        List<SyncOperationResult> results = new ArrayList<>();
        Set<UUID> failedInspectionIds = new HashSet<>();

        for (SyncOperationRequest operation : request.operations()) {
            UUID dependencyInspectionId = resolveInspectionId(operation);
            if (dependencyInspectionId != null && failedInspectionIds.contains(dependencyInspectionId)) {
                results.add(new SyncOperationResult(operation.operationId(), SyncOperationStatus.DEPENDENCY_FAILED,
                    null, null));
                continue;
            }

            SyncOperationResult result = self.processOne(userId, request.deviceId(), operation);
            results.add(result);

            if (dependencyInspectionId != null
                    && (result.status() == SyncOperationStatus.REJECTED
                        || result.status() == SyncOperationStatus.CONFLICT)) {
                failedInspectionIds.add(dependencyInspectionId);
            }
        }

        return new SyncPushResponse(results, request.lastPullCursor(), Instant.now());
    }

    /**
     * Processes exactly one operation in its own transaction so a failure
     * here never rolls back operations already committed earlier in the
     * batch (RN-070).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public SyncOperationResult processOne(UUID userId, UUID deviceId, SyncOperationRequest operation) {
        return syncOperationRepository.findById(operation.operationId())
            .map(SynchronizationService::toAlreadyProcessedResult)
            .orElseGet(() -> applyAndRecord(userId, deviceId, operation));
    }

    private SyncOperationResult applyAndRecord(UUID userId, UUID deviceId, SyncOperationRequest operation) {
        Outcome outcome = apply(userId, operation);

        SyncOperation record = SyncOperation.builder()
            .operationId(operation.operationId())
            .deviceId(deviceId)
            .userId(userId)
            .entityType(operation.entityType())
            .entityId(operation.entityId())
            .operationType(operation.operationType())
            .status(outcome.status())
            .resultEntityVersion(outcome.entityVersion())
            .errorCode(outcome.errorCode())
            .errorMessage(outcome.errorMessage())
            .build();
        syncOperationRepository.save(record);

        SyncOperationError error =
            outcome.errorCode() != null ? new SyncOperationError(outcome.errorCode(), outcome.errorMessage()) : null;
        return new SyncOperationResult(operation.operationId(), outcome.status(), outcome.entityVersion(), error);
    }

    private Outcome apply(UUID userId, SyncOperationRequest operation) {
        if (operation.operationType() == SyncOperationType.DELETE) {
            return Outcome.rejected(DELETE_NOT_SUPPORTED_CODE,
                "Deleting " + operation.entityType() + " via synchronization is not supported");
        }

        try {
            return switch (operation.entityType()) {
                case INSPECTION -> applyInspectionTransition(userId, operation);
                case INSPECTION_RESPONSE -> applyInspectionResponse(userId, operation);
                case NON_CONFORMITY -> applyNonConformity(userId, operation);
                case EVIDENCE -> Outcome.rejected(EVIDENCE_NOT_SUPPORTED_CODE,
                    "Evidence must be sent through the multipart upload endpoint");
            };
        } catch (ResourceNotFoundException e) {
            return Outcome.rejected(e.getCode(), e.getMessage());
        } catch (BusinessRuleViolationException e) {
            return Outcome.rejected(e.getCode(), e.getMessage());
        } catch (OptimisticLockingFailureException e) {
            return Outcome.conflict(VERSION_CONFLICT_CODE, "The entity was modified since baseVersion");
        } catch (IllegalArgumentException e) {
            return Outcome.rejected(INVALID_PAYLOAD_CODE, "Payload does not match the expected shape: " + e.getMessage());
        }
    }

    private Outcome applyInspectionTransition(UUID userId, SyncOperationRequest operation) {
        UUID inspectionId = operation.entityId();
        Inspection inspection = inspectionRepository.findById(inspectionId)
            .orElseThrow(() -> new ResourceNotFoundException("INSPECTION_NOT_FOUND", "Inspection not found"));

        if (!inspection.getTechnician().getId().equals(userId)) {
            return Outcome.rejected(NOT_OWNER_CODE, "You do not have access to this inspection");
        }

        if (operation.baseVersion() != null && !operation.baseVersion().equals(inspection.getVersion())) {
            return Outcome.conflict(VERSION_CONFLICT_CODE, "baseVersion does not match the current entity version");
        }

        InspectionTransitionSyncPayload payload = convert(operation.payload(), InspectionTransitionSyncPayload.class);
        if (payload.status() == null) {
            return Outcome.rejected(INVALID_PAYLOAD_CODE, "payload.status is required");
        }

        Inspection result = switch (payload.status()) {
            case IN_PROGRESS -> inspectionExecutionService.start(inspectionId, userId, true,
                payload.startedAtDevice(), payload.location());
            case SUBMITTED -> inspectionExecutionService.submit(inspectionId, userId, true, payload.completedAtDevice(),
                payload.location());
            default -> throw new BusinessRuleViolationException(UNSUPPORTED_TRANSITION_CODE,
                "Synchronization only supports transitioning to IN_PROGRESS or SUBMITTED");
        };

        return Outcome.applied(result.getVersion());
    }

    private Outcome applyInspectionResponse(UUID userId, SyncOperationRequest operation) {
        UUID snapshotId = operation.entityId();
        InspectionResponseSyncPayload payload = convert(operation.payload(), InspectionResponseSyncPayload.class);
        if (payload.inspectionId() == null) {
            return Outcome.rejected(INVALID_PAYLOAD_CODE, "payload.inspectionId is required");
        }

        Inspection inspection = inspectionRepository.findById(payload.inspectionId())
            .orElseThrow(() -> new ResourceNotFoundException("INSPECTION_NOT_FOUND", "Inspection not found"));
        if (!inspection.getTechnician().getId().equals(userId)) {
            return Outcome.rejected(NOT_OWNER_CODE, "You do not have access to this inspection");
        }

        InspectionResponse existing = inspectionResponseRepository
            .findByInspectionIdAndSnapshotId(payload.inspectionId(), snapshotId)
            .orElse(null);
        if (existing != null && operation.baseVersion() != null
                && !operation.baseVersion().equals(existing.getVersion())) {
            return Outcome.conflict(VERSION_CONFLICT_CODE, "baseVersion does not match the current entity version");
        }

        InspectionResponseCreateRequest request = new InspectionResponseCreateRequest(payload.valueText(),
            payload.valueNumber(), payload.valueBoolean(), payload.valueDate(), payload.valueChoice(),
            payload.observation());
        InspectionResponse saved =
            inspectionExecutionService.upsertResponse(payload.inspectionId(), snapshotId, userId, request);

        return Outcome.applied(saved.getVersion());
    }

    private Outcome applyNonConformity(UUID userId, SyncOperationRequest operation) {
        UUID nonConformityId = operation.entityId();
        NonConformitySyncPayload payload = convert(operation.payload(), NonConformitySyncPayload.class);
        if (payload.inspectionId() == null) {
            return Outcome.rejected(INVALID_PAYLOAD_CODE, "payload.inspectionId is required");
        }

        NonConformity existing = nonConformityRepository.findById(nonConformityId).orElse(null);
        if (existing != null) {
            if (!existing.getInspection().getId().equals(payload.inspectionId())) {
                return Outcome.rejected(ENTITY_ID_MISMATCH_CODE,
                    "entityId belongs to a different inspection than payload.inspectionId");
            }
            if (operation.baseVersion() != null && !operation.baseVersion().equals(existing.getVersion())) {
                return Outcome.conflict(VERSION_CONFLICT_CODE, "baseVersion does not match the current entity version");
            }
            NonConformityUpdateRequest updateRequest =
                new NonConformityUpdateRequest(payload.title(), payload.description(), payload.severity());
            NonConformity updated = nonConformityService.update(nonConformityId, updateRequest);
            return Outcome.applied(updated.getVersion());
        }

        NonConformityCreateRequest createRequest = new NonConformityCreateRequest(payload.title(),
            payload.description(), payload.severity(), payload.snapshotId(), payload.responseId());
        NonConformity created =
            nonConformityService.create(nonConformityId, payload.inspectionId(), userId, createRequest);
        return Outcome.applied(created.getVersion());
    }

    private <T> T convert(Map<String, Object> payload, Class<T> type) {
        try {
            return objectMapper.convertValue(payload, type);
        } catch (IllegalArgumentException e) {
            Throwable cause = e.getCause();
            String reason = cause instanceof InvalidFormatException ife ? ife.getOriginalMessage() : e.getMessage();
            throw new IllegalArgumentException(reason, e);
        }
    }

    private static UUID resolveInspectionId(SyncOperationRequest operation) {
        if (operation.entityType() == SyncEntityType.INSPECTION) {
            return operation.entityId();
        }
        Object raw = operation.payload().get("inspectionId");
        if (raw == null) {
            return null;
        }
        try {
            return UUID.fromString(raw.toString());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static SyncOperationResult toAlreadyProcessedResult(SyncOperation existing) {
        SyncOperationStatus status =
            existing.getStatus() == SyncOperationStatus.APPLIED ? SyncOperationStatus.ALREADY_APPLIED
                : existing.getStatus();
        SyncOperationError error = existing.getErrorCode() != null
            ? new SyncOperationError(existing.getErrorCode(), existing.getErrorMessage())
            : null;
        return new SyncOperationResult(existing.getOperationId(), status, existing.getResultEntityVersion(), error);
    }

    // ------------------------------------------------------------------
    // Pull
    // ------------------------------------------------------------------

    @Transactional(readOnly = true)
    public SyncPullResponse pull(UUID technicianId, String cursor) {
        Instant cursorInstant = parseCursor(cursor);

        List<SyncChange> changes = new ArrayList<>();
        for (Inspection inspection : inspectionRepository.findAll()) {
            if (!inspection.getTechnician().getId().equals(technicianId)) {
                continue;
            }
            if (inspection.getUpdatedAt().isAfter(cursorInstant)) {
                changes.add(toChange(inspection));
            }
        }
        for (InspectionResponse response : inspectionResponseRepository.findAll()) {
            if (!response.getInspection().getTechnician().getId().equals(technicianId)) {
                continue;
            }
            if (response.getUpdatedAt().isAfter(cursorInstant)) {
                changes.add(toChange(response));
            }
        }
        for (NonConformity nc : nonConformityRepository.findAll()) {
            if (!nc.getInspection().getTechnician().getId().equals(technicianId)) {
                continue;
            }
            if (nc.getUpdatedAt().isAfter(cursorInstant)) {
                changes.add(toChange(nc));
            }
        }

        changes.sort((a, b) -> a.occurredAt().compareTo(b.occurredAt()));
        if (changes.size() > PULL_PAGE_LIMIT) {
            changes = changes.subList(0, PULL_PAGE_LIMIT);
        }

        String nextCursor = changes.isEmpty() ? (cursor != null ? cursor : cursorInstant.toString())
            : changes.get(changes.size() - 1).occurredAt().toString();

        return new SyncPullResponse(changes, nextCursor, Instant.now());
    }

    /**
     * The cursor is the ISO-8601 instant of the last change already
     * delivered — a documented simplification of the {@code (occurredAt, id)}
     * tuple suggested (but left "[A DEFINIR]") in
     * plano-implementacao-backend.md §12.1: timestamptz precision in
     * Postgres makes same-instant collisions negligible at this project's
     * scale, and it keeps the pull query trivial to reason about. Absent on
     * the first synchronization.
     */
    private static Instant parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return Instant.EPOCH;
        }
        try {
            return Instant.parse(cursor);
        } catch (java.time.format.DateTimeParseException e) {
            throw new BusinessRuleViolationException("SYNC_INVALID_CURSOR", "cursor must be an ISO-8601 date-time");
        }
    }

    private static SyncChange toChange(Inspection inspection) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("status", inspection.getStatus().name());
        payload.put("startedAtDevice", toStringOrNull(inspection.getStartedAtDevice()));
        payload.put("startedAtServer", toStringOrNull(inspection.getStartedAtServer()));
        payload.put("completedAtDevice", toStringOrNull(inspection.getCompletedAtDevice()));
        payload.put("submittedAtServer", toStringOrNull(inspection.getSubmittedAtServer()));
        payload.put("canceledAt", toStringOrNull(inspection.getCanceledAt()));
        payload.put("canceledReason", inspection.getCanceledReason());
        return new SyncChange(SyncEntityType.INSPECTION, inspection.getId(), SyncOperationType.UPSERT, payload,
            inspection.getVersion(), inspection.getUpdatedAt());
    }

    private static SyncChange toChange(InspectionResponse response) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("inspectionId", response.getInspection().getId().toString());
        payload.put("snapshotId", response.getSnapshot().getId().toString());
        payload.put("valueText", response.getValueText());
        payload.put("valueNumber", response.getValueNumber());
        payload.put("valueBoolean", response.getValueBoolean());
        payload.put("valueDate", toStringOrNull(response.getValueDate()));
        payload.put("valueChoice", response.getValueChoice());
        payload.put("observation", response.getObservation());
        return new SyncChange(SyncEntityType.INSPECTION_RESPONSE, response.getSnapshot().getId(),
            SyncOperationType.UPSERT, payload, response.getVersion(), response.getUpdatedAt());
    }

    private static SyncChange toChange(NonConformity nc) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("inspectionId", nc.getInspection().getId().toString());
        payload.put("title", nc.getTitle());
        payload.put("description", nc.getDescription());
        payload.put("severity", nc.getSeverity().name());
        payload.put("status", nc.getStatus().name());
        return new SyncChange(SyncEntityType.NON_CONFORMITY, nc.getId(), SyncOperationType.UPSERT, payload,
            nc.getVersion(), nc.getUpdatedAt());
    }

    private static Object toStringOrNull(Object value) {
        return value != null ? value.toString() : null;
    }

    private record Outcome(SyncOperationStatus status, Integer entityVersion, String errorCode, String errorMessage) {

        static Outcome applied(Integer entityVersion) {
            return new Outcome(SyncOperationStatus.APPLIED, entityVersion, null, null);
        }

        static Outcome rejected(String code, String message) {
            return new Outcome(SyncOperationStatus.REJECTED, null, code, message);
        }

        static Outcome conflict(String code, String message) {
            return new Outcome(SyncOperationStatus.CONFLICT, null, code, message);
        }

    }

}
