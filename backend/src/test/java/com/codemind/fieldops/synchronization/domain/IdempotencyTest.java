package com.codemind.fieldops.synchronization.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.application.NonConformityService;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.synchronization.application.SynchronizationService;
import com.codemind.fieldops.synchronization.dto.SyncOperationRequest;
import com.codemind.fieldops.synchronization.dto.SyncOperationResult;
import com.codemind.fieldops.synchronization.repository.SyncOperationRepository;
import com.codemind.fieldops.user.domain.User;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * RN-067 ("cada operacao enviada deve possuir identificador idempotente
 * unico") and RN-068 ("o reenvio da mesma operacao nao pode criar
 * duplicidade") — exercised directly against
 * {@link SynchronizationService#processOne}, the unit that decides whether
 * an incoming {@code operationId} was already processed before touching any
 * domain service.
 */
class IdempotencyTest {

    private SyncOperationRepository syncOperationRepository;
    private InspectionRepository inspectionRepository;
    private InspectionResponseRepository inspectionResponseRepository;
    private NonConformityRepository nonConformityRepository;
    private InspectionExecutionService inspectionExecutionService;
    private NonConformityService nonConformityService;
    private SynchronizationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID deviceId = UUID.randomUUID();
    private final UUID operationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        syncOperationRepository = mock(SyncOperationRepository.class);
        inspectionRepository = mock(InspectionRepository.class);
        inspectionResponseRepository = mock(InspectionResponseRepository.class);
        nonConformityRepository = mock(NonConformityRepository.class);
        inspectionExecutionService = mock(InspectionExecutionService.class);
        nonConformityService = mock(NonConformityService.class);
        service = new SynchronizationService(syncOperationRepository, inspectionRepository,
            inspectionResponseRepository, nonConformityRepository, inspectionExecutionService, nonConformityService,
            null);
    }

    @Test
    void resendingAnAlreadyAppliedOperationReturnsAlreadyAppliedWithoutTouchingDomainServices() {
        SyncOperation recorded = SyncOperation.builder()
            .operationId(operationId)
            .deviceId(deviceId)
            .userId(userId)
            .entityType(SyncEntityType.NON_CONFORMITY)
            .entityId(UUID.randomUUID())
            .operationType(SyncOperationType.UPSERT)
            .status(SyncOperationStatus.APPLIED)
            .resultEntityVersion(5)
            .build();
        when(syncOperationRepository.findById(operationId)).thenReturn(Optional.of(recorded));

        SyncOperationRequest operation = new SyncOperationRequest(operationId, SyncEntityType.NON_CONFORMITY,
            recorded.getEntityId(), SyncOperationType.UPSERT, null, Map.of());

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.ALREADY_APPLIED);
        assertThat(result.entityVersion()).isEqualTo(5);
        verifyNoInteractions(nonConformityService, inspectionExecutionService);
        verify(syncOperationRepository, never()).save(any());
    }

    @Test
    void resendingAnAlreadyRejectedOperationReturnsTheSameRejectionWithoutReapplying() {
        SyncOperation recorded = SyncOperation.builder()
            .operationId(operationId)
            .deviceId(deviceId)
            .userId(userId)
            .entityType(SyncEntityType.INSPECTION)
            .entityId(UUID.randomUUID())
            .operationType(SyncOperationType.UPSERT)
            .status(SyncOperationStatus.REJECTED)
            .errorCode("SYNC_UNSUPPORTED_INSPECTION_TRANSITION")
            .errorMessage("Synchronization only supports transitioning to IN_PROGRESS or SUBMITTED")
            .build();
        when(syncOperationRepository.findById(operationId)).thenReturn(Optional.of(recorded));

        SyncOperationRequest operation = new SyncOperationRequest(operationId, SyncEntityType.INSPECTION,
            recorded.getEntityId(), SyncOperationType.UPSERT, null, Map.of());

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.REJECTED);
        assertThat(result.error().code()).isEqualTo("SYNC_UNSUPPORTED_INSPECTION_TRANSITION");
        verifyNoInteractions(inspectionExecutionService);
        verify(syncOperationRepository, never()).save(any());
    }

    @Test
    void firstTimeOperationIsAppliedAndRecordedExactlyOnce() {
        UUID inspectionId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        when(syncOperationRepository.findById(operationId)).thenReturn(Optional.empty());

        Inspection inspection = Inspection.builder()
            .id(inspectionId)
            .technician(User.builder().id(userId).build())
            .version(1)
            .build();
        when(inspectionRepository.findById(inspectionId)).thenReturn(Optional.of(inspection));
        when(inspectionResponseRepository.findByInspectionIdAndSnapshotId(inspectionId, snapshotId))
            .thenReturn(Optional.empty());

        InspectionResponse saved = InspectionResponse.builder().id(snapshotId).version(1).build();
        when(inspectionExecutionService.upsertResponse(any(), any(), any(), any())).thenReturn(saved);

        SyncOperationRequest operation = new SyncOperationRequest(operationId, SyncEntityType.INSPECTION_RESPONSE,
            snapshotId, SyncOperationType.UPSERT, null,
            Map.of("inspectionId", inspectionId.toString(), "valueBoolean", true));

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.APPLIED);
        assertThat(result.entityVersion()).isEqualTo(1);
        verify(syncOperationRepository).save(
            org.mockito.ArgumentMatchers.argThat(record -> record.getOperationId().equals(operationId)
                && record.getStatus() == SyncOperationStatus.APPLIED));
    }

}
