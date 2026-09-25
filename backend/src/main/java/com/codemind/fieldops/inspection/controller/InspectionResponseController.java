package com.codemind.fieldops.inspection.controller;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.InspectionResponse;
import com.codemind.fieldops.inspection.dto.InspectionResponseCreateRequest;
import com.codemind.fieldops.inspection.dto.InspectionResponseDto;
import com.codemind.fieldops.inspection.mapper.InspectionResponseMapper;
import com.codemind.fieldops.shared.security.JwtClaims;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inspections/{inspectionId}/responses")
public class InspectionResponseController {

    private final InspectionExecutionService executionService;
    private final InspectionResponseMapper responseMapper;

    public InspectionResponseController(InspectionExecutionService executionService,
                                         InspectionResponseMapper responseMapper) {
        this.executionService = executionService;
        this.responseMapper = responseMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public List<InspectionResponseDto> listResponses(@PathVariable UUID inspectionId,
                                                      @AuthenticationPrincipal Jwt jwt) {
        String role = jwt.getClaimAsString(JwtClaims.ROLE);
        UUID userId = UUID.fromString(jwt.getSubject());

        if ("TECHNICIAN".equals(role)) {
            // Verify technician is assigned to this inspection
            executionService.getInspectionForTechnician(inspectionId, userId);
        }

        List<InspectionResponse> responses = executionService.listResponses(inspectionId);
        return responses.stream().map(responseMapper::toDto).toList();
    }

    @PutMapping("/{snapshotId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public InspectionResponseDto upsertResponse(@PathVariable UUID inspectionId,
                                                  @PathVariable UUID snapshotId,
                                                  @RequestBody InspectionResponseCreateRequest request,
                                                  @AuthenticationPrincipal Jwt jwt) {
        String role = jwt.getClaimAsString(JwtClaims.ROLE);
        UUID userId = UUID.fromString(jwt.getSubject());

        if ("TECHNICIAN".equals(role)) {
            // Verify technician is assigned to this inspection
            executionService.getInspectionForTechnician(inspectionId, userId);
        }

        InspectionResponse response = executionService.upsertResponse(inspectionId, snapshotId, userId, request);
        return responseMapper.toDto(response);
    }

}
