package com.codemind.fieldops.evidence.application;

import com.codemind.fieldops.evidence.domain.Evidence;
import com.codemind.fieldops.evidence.domain.EvidenceUploadValidator;
import com.codemind.fieldops.evidence.repository.EvidenceRepository;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.repository.InspectionRepository;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.shared.audit.AuditEventPublisher;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import com.codemind.fieldops.shared.error.ResourceConflictException;
import com.codemind.fieldops.shared.error.ResourceNotFoundException;
import com.codemind.fieldops.shared.storage.EvidenceStorageClient;
import com.codemind.fieldops.shared.storage.EvidenceStorageProperties;
import com.codemind.fieldops.user.domain.User;
import com.codemind.fieldops.user.repository.UserRepository;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EvidenceService {

    private static final String INSPECTION_NOT_FOUND_CODE = "INSPECTION_NOT_FOUND";
    private static final String RESPONSE_NOT_FOUND_CODE = "RESPONSE_NOT_FOUND";
    private static final String NC_NOT_FOUND_CODE = "NON_CONFORMITY_NOT_FOUND";
    private static final String USER_NOT_FOUND_CODE = "USER_NOT_FOUND";
    private static final String EVIDENCE_NOT_FOUND_CODE = "EVIDENCE_NOT_FOUND";
    private static final String EVIDENCE_ALREADY_PROCESSED_CODE = "EVIDENCE_ALREADY_PROCESSED";
    private static final String EVIDENCE_READ_ONLY_CODE = "EVIDENCE_READ_ONLY_APPROVED_INSPECTION";
    private static final String UPLOAD_FAILED_CODE = "EVIDENCE_UPLOAD_FAILED";

    private final EvidenceRepository evidenceRepository;
    private final InspectionRepository inspectionRepository;
    private final InspectionResponseRepository responseRepository;
    private final NonConformityRepository nonConformityRepository;
    private final UserRepository userRepository;
    private final EvidenceStorageClient storageClient;
    private final EvidenceStorageProperties storageProperties;
    private final AuditEventPublisher auditEventPublisher;

    public EvidenceService(EvidenceRepository evidenceRepository, InspectionRepository inspectionRepository,
            InspectionResponseRepository responseRepository, NonConformityRepository nonConformityRepository,
            UserRepository userRepository, EvidenceStorageClient storageClient,
            EvidenceStorageProperties storageProperties, AuditEventPublisher auditEventPublisher) {
        this.evidenceRepository = evidenceRepository;
        this.inspectionRepository = inspectionRepository;
        this.responseRepository = responseRepository;
        this.nonConformityRepository = nonConformityRepository;
        this.userRepository = userRepository;
        this.storageClient = storageClient;
        this.storageProperties = storageProperties;
        this.auditEventPublisher = auditEventPublisher;
    }

    @Transactional
    public Evidence upload(UUID inspectionId, UUID userId, EvidenceUploadCommand command, MultipartFile file) {
        Inspection inspection = getInspection(inspectionId);
        User createdBy = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException(USER_NOT_FOUND_CODE, "User not found"));

        evidenceRepository.findByIdempotencyKey(command.idempotencyKey()).ifPresent(existing -> {
            throw new ResourceConflictException(EVIDENCE_ALREADY_PROCESSED_CODE,
                "This idempotencyKey has already been processed");
        });

        EvidenceUploadValidator.validateContentType(file.getContentType());
        EvidenceUploadValidator.validateSize(file.getSize(), storageProperties.getMaxUploadSizeBytes());
        EvidenceUploadValidator.validateLocation(command.latitude(), command.longitude());

        InspectionResponse response = null;
        if (command.responseId() != null) {
            response = responseRepository.findById(command.responseId())
                .orElseThrow(() -> new ResourceNotFoundException(RESPONSE_NOT_FOUND_CODE, "Response not found"));
            if (!response.getInspection().getId().equals(inspectionId)) {
                throw new ResourceNotFoundException(RESPONSE_NOT_FOUND_CODE,
                    "Response does not belong to this inspection");
            }
        }

        NonConformity nonConformity = null;
        if (command.nonConformityId() != null) {
            nonConformity = nonConformityRepository.findById(command.nonConformityId())
                .orElseThrow(() -> new ResourceNotFoundException(NC_NOT_FOUND_CODE, "Non-conformity not found"));
            if (!nonConformity.getInspection().getId().equals(inspectionId)) {
                throw new ResourceNotFoundException(NC_NOT_FOUND_CODE,
                    "Non-conformity does not belong to this inspection");
            }
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (java.io.IOException e) {
            throw new BusinessRuleViolationException(UPLOAD_FAILED_CODE, "Could not read uploaded file");
        }

        String storageKey =
            EvidenceUploadValidator.generateStorageKey(inspectionId, file.getContentType());
        storageClient.upload(content, storageKey, file.getContentType());

        Instant now = Instant.now();
        Evidence evidence = Evidence.builder()
            .inspection(inspection)
            .response(response)
            .nonConformity(nonConformity)
            .idempotencyKey(command.idempotencyKey())
            .type(command.type())
            .storageKey(storageKey)
            .originalFileName(file.getOriginalFilename())
            .mimeType(file.getContentType())
            .sizeBytes(file.getSize())
            .checksum(sha256Hex(content))
            .description(command.description())
            .latitude(command.latitude())
            .longitude(command.longitude())
            .capturedAtDevice(command.capturedAtDevice())
            .serverReceivedAt(now)
            .uploadedAt(now)
            .createdBy(createdBy)
            .build();

        Evidence saved = evidenceRepository.save(evidence);

        auditEventPublisher.record("EVIDENCE_ADDED", "EVIDENCE", saved.getId(), inspectionId, userId, null,
            Map.of("storageKey", storageKey, "mimeType", saved.getMimeType()), null);

        return saved;
    }

    @Transactional(readOnly = true)
    public List<Evidence> list(UUID inspectionId, UUID responseId, UUID nonConformityId) {
        getInspection(inspectionId);
        if (responseId != null) {
            return evidenceRepository.findByInspectionIdAndResponseId(inspectionId, responseId);
        }
        if (nonConformityId != null) {
            return evidenceRepository.findByInspectionIdAndNonConformityId(inspectionId, nonConformityId);
        }
        return evidenceRepository.findByInspectionId(inspectionId);
    }

    @Transactional(readOnly = true)
    public Evidence getById(UUID id) {
        return evidenceRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(EVIDENCE_NOT_FOUND_CODE, "Evidence not found"));
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        Evidence evidence = getById(id);
        if (evidence.getInspection().getStatus() == InspectionStatus.APPROVED) {
            throw new ResourceConflictException(EVIDENCE_READ_ONLY_CODE,
                "Evidence of an approved inspection is read-only");
        }

        storageClient.delete(evidence.getStorageKey());
        evidenceRepository.delete(evidence);

        auditEventPublisher.record("EVIDENCE_REMOVED", "EVIDENCE", id, evidence.getInspection().getId(), userId,
            Map.of("storageKey", evidence.getStorageKey()), null, null);
    }

    public String accessUrlFor(Evidence evidence) {
        return storageClient.generateTemporaryUrl(evidence.getStorageKey());
    }

    private Inspection getInspection(UUID id) {
        return inspectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException(INSPECTION_NOT_FOUND_CODE, "Inspection not found"));
    }

    private static String sha256Hex(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

}
