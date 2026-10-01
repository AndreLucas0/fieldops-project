package com.codemind.fieldops.nonconformity.application;

import com.codemind.fieldops.evidence.repository.EvidenceRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformityEvidenceValidator;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.dto.NonConformityCreateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityStatusUpdateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityUpdateRequest;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.error.ResourceConflictException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NonConformityService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String SNAPSHOT_NOT_FOUND_CODE = "SNAPSHOT_NOT_FOUND";
    private static final String RESPONSE_NOT_FOUND_CODE = "RESPONSE_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String NC_NOT_FOUND_CODE = "NON_CONFORMITY_NOT_FOUND";
    private static final String NC_READ_ONLY_CODE = "NON_CONFORMITY_READ_ONLY_APPROVED_INSPECTION";

    private final NonConformityRepository nonConformityRepository;
    private final InspectionRepository inspectionRepository;
    private final ItemSnapshotRepository itemSnapshotRepository;
    private final InspectionResponseRepository responseRepository;
    private final UserRepository userRepository;
    private final EvidenceRepository evidenceRepository;

    public NonConformityService(NonConformityRepository nonConformityRepository,
                                 InspectionRepository inspectionRepository,
                                 ItemSnapshotRepository itemSnapshotRepository,
                                 InspectionResponseRepository responseRepository,
                                 UserRepository userRepository,
                                 EvidenceRepository evidenceRepository) {
        this.nonConformityRepository = nonConformityRepository;
        this.inspectionRepository = inspectionRepository;
        this.itemSnapshotRepository = itemSnapshotRepository;
        this.responseRepository = responseRepository;
        this.userRepository = userRepository;
        this.evidenceRepository = evidenceRepository;
    }

    @Transactional
    public NonConformity create(UUID inspectionId, UUID reportedByUserId, boolean isTechnician,
            NonConformityCreateRequest request) {
        checkTechnicianAccess(findInspection(inspectionId), reportedByUserId, isTechnician);
        return create(null, inspectionId, reportedByUserId, request);
    }

    /**
     * Used by the synchronization push handler, which needs the persisted id
     * to match the client-generated {@code entityId} so a later pull
     * recognizes the record as the one it created offline.
     */
    // noRollbackFor: sync (processOne, REQUIRES_NEW) joins this transaction and turns the RN-082
    // conflict into a REJECTED result; it must not mark the caller rollback-only (same as BF-002).
    @Transactional(noRollbackFor = ResourceConflictException.class)
    public NonConformity create(UUID id, UUID inspectionId, UUID reportedByUserId, NonConformityCreateRequest request) {
        Inspection inspection = inspectionRepository.findById(inspectionId)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
        checkWritable(inspection);

        User reportedBy = userRepository.findById(reportedByUserId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        ItemSnapshot snapshot = null;
        if (request.snapshotId() != null) {
            snapshot = itemSnapshotRepository.findById(request.snapshotId())
                .orElseThrow(() -> new ResourceNotFoundException(SNAPSHOT_NOT_FOUND_CODE, "Snapshot not found"));
            // Verify snapshot belongs to this inspection
            if (!snapshot.getInspection().getId().equals(inspectionId)) {
                throw new ResourceNotFoundException(SNAPSHOT_NOT_FOUND_CODE,
                    "Snapshot does not belong to this inspection");
            }
        }

        InspectionResponse response = null;
        if (request.responseId() != null) {
            response = responseRepository.findById(request.responseId())
                .orElseThrow(() -> new ResourceNotFoundException(RESPONSE_NOT_FOUND_CODE, "Response not found"));
        }

        NonConformity nc = NonConformity.builder()
            .id(id)
            .inspection(inspection)
            .snapshot(snapshot)
            .response(response)
            .reportedBy(reportedBy)
            .title(request.title())
            .description(request.description())
            .severity(request.severity())
            .status(NonConformityStatus.OPEN)
            .build();

        return nonConformityRepository.save(nc);
    }

    @Transactional(readOnly = true)
    public List<NonConformity> listByInspection(UUID inspectionId, UUID userId, boolean isTechnician) {
        checkTechnicianAccess(findInspection(inspectionId), userId, isTechnician);
        return nonConformityRepository.findByInspectionId(inspectionId);
    }

    @Transactional(readOnly = true)
    public NonConformity getById(UUID id, UUID userId, boolean isTechnician) {
        NonConformity nc = findOrThrow(id);
        checkTechnicianAccess(nc.getInspection(), userId, isTechnician);
        return nc;
    }

    private NonConformity findOrThrow(UUID id) {
        return nonConformityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NC_NOT_FOUND_CODE, "Non-conformity not found"));
    }

    @Transactional
    public NonConformity updateStatus(UUID id, NonConformityStatusUpdateRequest request, UUID userId,
            boolean isTechnician) {
        NonConformity nc = getById(id, userId, isTechnician);
        checkWritable(nc.getInspection());
        nc.setStatus(request.status());
        return nonConformityRepository.save(nc);
    }

    @Transactional(readOnly = true)
    public Page<NonConformity> list(UUID inspectionId, NonConformitySeverity severity, NonConformityStatus status,
            Pageable pageable) {
        Specification<NonConformity> specification = Specification
            .where(NonConformitySpecifications.hasInspectionId(inspectionId))
            .and(NonConformitySpecifications.hasSeverity(severity))
            .and(NonConformitySpecifications.hasStatus(status));
        return nonConformityRepository.findAll(specification, pageable);
    }

    @Transactional
    public NonConformity update(UUID id, NonConformityUpdateRequest request, UUID userId, boolean isTechnician) {
        checkTechnicianAccess(findOrThrow(id).getInspection(), userId, isTechnician);
        return update(id, request);
    }

    /**
     * Also used by the synchronization push handler, which enforces inspection ownership itself.
     */
    @Transactional(noRollbackFor = ResourceConflictException.class)
    public NonConformity update(UUID id, NonConformityUpdateRequest request) {
        NonConformity nc = findOrThrow(id);
        checkWritable(nc.getInspection());
        boolean hasEvidence = evidenceRepository.existsByNonConformityId(id);
        NonConformityEvidenceValidator.validate(request.severity(), hasEvidence);

        nc.setTitle(request.title());
        nc.setDescription(request.description());
        nc.setSeverity(request.severity());
        return nonConformityRepository.save(nc);
    }

    private Inspection findInspection(UUID inspectionId) {
        return inspectionRepository.findById(inspectionId)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
    }

    // RN-082 / RN-076: an approved inspection is locked for common editing (mirrors evidence, RN-049).
    // Must run before any write: the sync-called methods use noRollbackFor, so a conflict raised after
    // a mutation would be committed.
    private static void checkWritable(Inspection inspection) {
        if (inspection.getStatus() == InspectionStatus.APPROVED) {
            throw new ResourceConflictException(NC_READ_ONLY_CODE,
                "Non-conformities of an approved inspection are read-only");
        }
    }

    // RN-004: a technician only reaches non-conformities of inspections assigned to them
    private static void checkTechnicianAccess(Inspection inspection, UUID userId, boolean isTechnician) {
        if (isTechnician && !inspection.getTechnician().getId().equals(userId)) {
            throw new AccessDeniedException("You do not have access to this inspection");
        }
    }

}
