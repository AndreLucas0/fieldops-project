package com.codemind.fieldops.evidence.controller;

import com.codemind.fieldops.evidence.application.EvidenceService;
import com.codemind.fieldops.evidence.application.EvidenceUploadCommand;
import com.codemind.fieldops.evidence.domain.Evidence;
import com.codemind.fieldops.evidence.domain.EvidenceType;
import com.codemind.fieldops.evidence.dto.EvidenceResponse;
import com.codemind.fieldops.evidence.mapper.EvidenceMapper;
import com.codemind.fieldops.shared.error.BusinessRuleViolationException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class EvidenceController {

    private final EvidenceService evidenceService;
    private final EvidenceMapper evidenceMapper;

    public EvidenceController(EvidenceService evidenceService, EvidenceMapper evidenceMapper) {
        this.evidenceService = evidenceService;
        this.evidenceMapper = evidenceMapper;
    }

    @PostMapping(value = "/inspections/{inspectionId}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public EvidenceResponse upload(@PathVariable UUID inspectionId,
            @RequestParam UUID idempotencyKey,
            @RequestParam(required = false) UUID responseId,
            @RequestParam(required = false) UUID nonConformityId,
            @RequestParam EvidenceType type,
            @RequestParam(required = false) String description,
            @RequestParam String capturedAtDevice,
            @RequestParam(required = false) BigDecimal latitude,
            @RequestParam(required = false) BigDecimal longitude,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        EvidenceUploadCommand command = new EvidenceUploadCommand(idempotencyKey, responseId, nonConformityId, type,
            description, parseInstant(capturedAtDevice), latitude, longitude);
        Evidence evidence = evidenceService.upload(inspectionId, userId, command, file);
        return toResponse(evidence);
    }

    @GetMapping("/inspections/{inspectionId}/evidence")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public List<EvidenceResponse> list(@PathVariable UUID inspectionId,
            @RequestParam(required = false) UUID responseId,
            @RequestParam(required = false) UUID nonConformityId) {
        return evidenceService.list(inspectionId, responseId, nonConformityId).stream()
            .map(this::toResponse)
            .toList();
    }

    @GetMapping("/evidence/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public EvidenceResponse get(@PathVariable UUID id) {
        return toResponse(evidenceService.getById(id));
    }

    @DeleteMapping("/evidence/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        evidenceService.delete(id, userId);
    }

    private EvidenceResponse toResponse(Evidence evidence) {
        return evidenceMapper.toResponse(evidence, evidenceService.accessUrlFor(evidence));
    }

    private static Instant parseInstant(String value) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException e) {
            throw new BusinessRuleViolationException("INVALID_DATE_TIME",
                "capturedAtDevice must be an ISO-8601 date-time");
        }
    }

}
