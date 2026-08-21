package com.codemind.fieldops.nonconformity.application;

import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.dto.NonConformityCreateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityStatusUpdateRequest;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NonConformityService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String SNAPSHOT_NOT_FOUND_CODE = "SNAPSHOT_NOT_FOUND";
    private static final String RESPONSE_NOT_FOUND_CODE = "RESPONSE_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String NC_NOT_FOUND_CODE = "NON_CONFORMITY_NOT_FOUND";

    private final NonConformityRepository nonConformityRepository;
    private final InspectionRepository inspectionRepository;
    private final ItemSnapshotRepository itemSnapshotRepository;
    private final InspectionResponseRepository responseRepository;
    private final UserRepository userRepository;

    public NonConformityService(NonConformityRepository nonConformityRepository,
                                 InspectionRepository inspectionRepository,
                                 ItemSnapshotRepository itemSnapshotRepository,
                                 InspectionResponseRepository responseRepository,
                                 UserRepository userRepository) {
        this.nonConformityRepository = nonConformityRepository;
        this.inspectionRepository = inspectionRepository;
        this.itemSnapshotRepository = itemSnapshotRepository;
        this.responseRepository = responseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public NonConformity create(UUID inspectionId, UUID reportedByUserId, NonConformityCreateRequest request) {
        Inspection inspection = inspectionRepository.findById(inspectionId)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));

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
    public List<NonConformity> listByInspection(UUID inspectionId) {
        // Verify inspection exists
        if (!inspectionRepository.existsById(inspectionId)) {
            throw new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found");
        }
        return nonConformityRepository.findByInspectionId(inspectionId);
    }

    @Transactional(readOnly = true)
    public NonConformity getById(UUID id) {
        return nonConformityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(NC_NOT_FOUND_CODE, "Non-conformity not found"));
    }

    @Transactional
    public NonConformity updateStatus(UUID id, NonConformityStatusUpdateRequest request) {
        NonConformity nc = getById(id);
        nc.setStatus(request.status());
        return nonConformityRepository.save(nc);
    }

}
