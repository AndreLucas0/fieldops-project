package com.codemind.fieldops.inspection.controller;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.dto.StartInspectionRequest;
import com.codemind.fieldops.inspection.dto.SubmitInspectionRequest;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.shared.security.JwtClaims;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inspections")
public class InspectionLifecycleController {

    private final InspectionExecutionService executionService;
    private final InspectionMapper inspectionMapper;

    public InspectionLifecycleController(InspectionExecutionService executionService,
                                          InspectionMapper inspectionMapper) {
        this.executionService = executionService;
        this.inspectionMapper = inspectionMapper;
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public InspectionResponse start(@PathVariable UUID id,
                                     @RequestBody(required = false) StartInspectionRequest request,
                                     @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        boolean isTechnician = "TECHNICIAN".equals(jwt.getClaimAsString(JwtClaims.ROLE));
        Inspection inspection = executionService.start(id, userId, isTechnician,
            request != null ? request.startedAtDevice() : null,
            request != null ? request.location() : null);
        return inspectionMapper.toResponse(inspection);
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public InspectionResponse submit(@PathVariable UUID id,
                                      @RequestBody(required = false) SubmitInspectionRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        String role = jwt.getClaimAsString(JwtClaims.ROLE);
        boolean isTechnician = "TECHNICIAN".equals(role);
        Inspection inspection = executionService.submit(id, userId, isTechnician,
            request != null ? request.completedAtDevice() : null,
            request != null ? request.location() : null);
        return inspectionMapper.toResponse(inspection);
    }

}
