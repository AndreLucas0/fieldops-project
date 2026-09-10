package com.codemind.fieldops.synchronization.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.application.NonConformityService;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
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
import org.springframework.dao.OptimisticLockingFailureException;

/**
 * RN-075/RN-076 — a version mismatch between the client-sent
 * {@code baseVersion} and the current entity version must be reported as
 * {@code CONFLICT} without applying the operation, whether detected by the
 * explicit pre-check in {@link SynchronizationService} or surfaced later as
 * an {@link OptimisticLockingFailureException} from the underlying domain
 * service.
 */
class ConflictDetectionTest {

    private SyncOperationRepository syncOperationRepository;
    private InspectionRepository inspectionRepository;
    private InspectionResponseRepository inspectionResponseRepository;
    private NonConformityRepository nonConformityRepository;
    private InspectionExecutionService inspectionExecutionService;
    private NonConformityService nonConformityService;
    private SynchronizationService service;

    private final UUID userId = UUID.randomUUID();
    private final UUID deviceId = UUID.randomUUID();

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
        when(syncOperationRepository.findById(any())).thenReturn(Optional.empty());
    }

    @Test
    void inspectionTransitionWithStaleBaseVersionIsReportedAsConflict() {
        UUID inspectionId = UUID.randomUUID();
        Inspection inspection = Inspection.builder()
            .id(inspectionId)
            .technician(User.builder().id(userId).build())
            .version(4)
            .build();
        when(inspectionRepository.findById(inspectionId)).thenReturn(Optional.of(inspection));

        SyncOperationRequest operation = new SyncOperationRequest(UUID.randomUUID(), SyncEntityType.INSPECTION,
            inspectionId, SyncOperationType.UPSERT, 3, Map.of("status", "SUBMITTED"));

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.CONFLICT);
        verify(inspectionExecutionService, never()).submit(any(), any(), anyBoolean(), any(), any());
        verify(inspectionExecutionService, never()).start(any(), any(), any(), any());
    }

    @Test
    void inspectionResponseWithStaleBaseVersionIsReportedAsConflict() {
        UUID inspectionId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        Inspection inspection = Inspection.builder()
            .id(inspectionId)
            .technician(User.builder().id(userId).build())
            .version(1)
            .build();
        when(inspectionRepository.findById(inspectionId)).thenReturn(Optional.of(inspection));
        InspectionResponse existing = InspectionResponse.builder().id(snapshotId).version(3).build();
        when(inspectionResponseRepository.findByInspectionIdAndSnapshotId(inspectionId, snapshotId))
            .thenReturn(Optional.of(existing));

        SyncOperationRequest operation = new SyncOperationRequest(UUID.randomUUID(), SyncEntityType.INSPECTION_RESPONSE,
            snapshotId, SyncOperationType.UPSERT, 2, Map.of("inspectionId", inspectionId.toString()));

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.CONFLICT);
        verify(inspectionExecutionService, never()).upsertResponse(any(), any(), any(), any());
    }

    @Test
    void nonConformityWithStaleBaseVersionIsReportedAsConflict() {
        UUID inspectionId = UUID.randomUUID();
        UUID nonConformityId = UUID.randomUUID();
        Inspection inspection = Inspection.builder().id(inspectionId).version(1).build();
        NonConformity existing = NonConformity.builder()
            .id(nonConformityId)
            .inspection(inspection)
            .severity(NonConformitySeverity.LOW)
            .version(1)
            .build();
        when(nonConformityRepository.findById(nonConformityId)).thenReturn(Optional.of(existing));

        SyncOperationRequest operation = new SyncOperationRequest(UUID.randomUUID(), SyncEntityType.NON_CONFORMITY,
            nonConformityId, SyncOperationType.UPSERT, 0,
            Map.of("inspectionId", inspectionId.toString(), "title", "t", "severity", "LOW"));

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.CONFLICT);
        verify(nonConformityService, never()).update(any(), any());
    }

    @Test
    void optimisticLockingFailureRaisedByTheDomainServiceIsMappedToConflict() {
        UUID inspectionId = UUID.randomUUID();
        UUID snapshotId = UUID.randomUUID();
        Inspection inspection = Inspection.builder()
            .id(inspectionId)
            .technician(User.builder().id(userId).build())
            .version(1)
            .build();
        when(inspectionRepository.findById(inspectionId)).thenReturn(Optional.of(inspection));
        when(inspectionResponseRepository.findByInspectionIdAndSnapshotId(inspectionId, snapshotId))
            .thenReturn(Optional.empty());
        when(inspectionExecutionService.upsertResponse(any(), any(), any(), any()))
            .thenThrow(new OptimisticLockingFailureException("stale"));

        SyncOperationRequest operation = new SyncOperationRequest(UUID.randomUUID(), SyncEntityType.INSPECTION_RESPONSE,
            snapshotId, SyncOperationType.UPSERT, null, Map.of("inspectionId", inspectionId.toString()));

        SyncOperationResult result = service.processOne(userId, deviceId, operation);

        assertThat(result.status()).isEqualTo(SyncOperationStatus.CONFLICT);
    }

}
