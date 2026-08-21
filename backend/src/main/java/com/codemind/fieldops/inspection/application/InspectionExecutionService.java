package com.codemind.fieldops.inspection.application;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponseCreateRequest;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InspectionExecutionService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String SNAPSHOT_NOT_FOUND_CODE = "SNAPSHOT_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String INSPECTION_CANNOT_BE_STARTED_CODE = "INSPECTION_CANNOT_BE_STARTED";
    private static final String INSPECTION_CANNOT_BE_SUBMITTED_CODE = "INSPECTION_CANNOT_BE_SUBMITTED";
    private static final String MISSING_REQUIRED_RESPONSES_CODE = "MISSING_REQUIRED_RESPONSES";

    private final InspectionRepository inspectionRepository;
    private final ItemSnapshotRepository itemSnapshotRepository;
    private final InspectionResponseRepository responseRepository;
    private final UserRepository userRepository;

    public InspectionExecutionService(InspectionRepository inspectionRepository,
                                       ItemSnapshotRepository itemSnapshotRepository,
                                       InspectionResponseRepository responseRepository,
                                       UserRepository userRepository) {
        this.inspectionRepository = inspectionRepository;
        this.itemSnapshotRepository = itemSnapshotRepository;
        this.responseRepository = responseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Inspection start(UUID inspectionId) {
        Inspection inspection = getInspection(inspectionId);

        if (inspection.getStatus() != InspectionStatus.DRAFT
                && inspection.getStatus() != InspectionStatus.ASSIGNED) {
            throw new BusinessRuleViolationException(INSPECTION_CANNOT_BE_STARTED_CODE,
                "Only DRAFT or ASSIGNED inspections can be started");
        }

        inspection.setStatus(InspectionStatus.IN_PROGRESS);
        inspection.setStartedAtServer(Instant.now());
        return inspectionRepository.save(inspection);
    }

    @Transactional
    public Inspection submit(UUID inspectionId, UUID userId, boolean isTechnician) {
        Inspection inspection = getInspection(inspectionId);

        if (isTechnician && !inspection.getTechnician().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have access to this inspection");
        }

        if (inspection.getStatus() != InspectionStatus.IN_PROGRESS) {
            throw new BusinessRuleViolationException(INSPECTION_CANNOT_BE_SUBMITTED_CODE,
                "Only IN_PROGRESS inspections can be submitted");
        }

        // Validate all required snapshots have responses
        List<ItemSnapshot> requiredSnapshots = itemSnapshotRepository
            .findByInspectionIdOrderBySectionOrderAscItemOrderAsc(inspectionId)
            .stream()
            .filter(s -> Boolean.TRUE.equals(s.getRequired()))
            .toList();

        if (!requiredSnapshots.isEmpty()) {
            List<UUID> requiredSnapshotIds = requiredSnapshots.stream()
                .map(ItemSnapshot::getId)
                .toList();
            long answeredCount = responseRepository.countByInspectionIdAndSnapshotIdIn(inspectionId, requiredSnapshotIds);
            if (answeredCount < requiredSnapshotIds.size()) {
                throw new BusinessRuleViolationException(MISSING_REQUIRED_RESPONSES_CODE,
                    "All required items must be answered before submitting");
            }
        }

        inspection.setStatus(InspectionStatus.SUBMITTED);
        inspection.setSubmittedAtServer(Instant.now());
        return inspectionRepository.save(inspection);
    }

    @Transactional
    public InspectionResponse upsertResponse(UUID inspectionId, UUID snapshotId, UUID respondedByUserId,
                                              InspectionResponseCreateRequest request) {
        Inspection inspection = getInspection(inspectionId);

        ItemSnapshot snapshot = itemSnapshotRepository.findById(snapshotId)
            .orElseThrow(() -> new ResourceNotFoundException(SNAPSHOT_NOT_FOUND_CODE, "Snapshot not found"));

        // Verify snapshot belongs to this inspection
        if (!snapshot.getInspection().getId().equals(inspectionId)) {
            throw new ResourceNotFoundException(SNAPSHOT_NOT_FOUND_CODE,
                "Snapshot does not belong to this inspection");
        }

        User respondedBy = userRepository.findById(respondedByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        InspectionResponse response = responseRepository
            .findByInspectionIdAndSnapshotId(inspectionId, snapshotId)
            .orElse(null);

        if (response == null) {
            response = InspectionResponse.builder()
                .inspection(inspection)
                .snapshot(snapshot)
                .respondedBy(respondedBy)
                .build();
        } else {
            response.setRespondedBy(respondedBy);
        }

        response.setValueText(request.valueText());
        response.setValueNumber(request.valueNumber());
        response.setValueBoolean(request.valueBoolean());
        response.setValueDate(request.valueDate());
        response.setValueChoice(request.valueChoice());
        response.setObservation(request.observation());

        return responseRepository.save(response);
    }

    @Transactional(readOnly = true)
    public List<InspectionResponse> listResponses(UUID inspectionId) {
        // Verify inspection exists
        getInspection(inspectionId);
        return responseRepository.findByInspectionId(inspectionId);
    }

    @Transactional(readOnly = true)
    public Inspection getInspectionForTechnician(UUID inspectionId, UUID technicianId) {
        Inspection inspection = getInspection(inspectionId);
        if (!inspection.getTechnician().getId().equals(technicianId)) {
            throw new AccessDeniedException("You do not have access to this inspection");
        }
        return inspection;
    }

    @Transactional(readOnly = true)
    public Page<Inspection> listForTechnician(UUID technicianId, Pageable pageable) {
        return inspectionRepository.findAll(
            InspectionSpecifications.hasTechnicianId(technicianId),
            pageable
        );
    }

    private Inspection getInspection(UUID id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
    }

}
