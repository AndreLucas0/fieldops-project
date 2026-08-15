package com.codemind.fieldops.nonconformity.controller;

import com.codemind.fieldops.nonconformity.application.NonConformityService;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.dto.NonConformityCreateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityResponse;
import com.codemind.fieldops.nonconformity.dto.NonConformityStatusUpdateRequest;
import com.codemind.fieldops.nonconformity.mapper.NonConformityMapper;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NonConformityController {

    private final NonConformityService nonConformityService;
    private final NonConformityMapper nonConformityMapper;

    public NonConformityController(NonConformityService nonConformityService,
                                    NonConformityMapper nonConformityMapper) {
        this.nonConformityService = nonConformityService;
        this.nonConformityMapper = nonConformityMapper;
    }

    @PostMapping("/inspections/{inspectionId}/non-conformities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse create(@PathVariable UUID inspectionId,
                                         @Valid @RequestBody NonConformityCreateRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        NonConformity nc = nonConformityService.create(inspectionId, userId, request);
        return nonConformityMapper.toResponse(nc);
    }

    @GetMapping("/inspections/{inspectionId}/non-conformities")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public List<NonConformityResponse> listByInspection(@PathVariable UUID inspectionId) {
        return nonConformityService.listByInspection(inspectionId)
            .stream()
            .map(nonConformityMapper::toResponse)
            .toList();
    }

    @GetMapping("/non-conformities/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse getById(@PathVariable UUID id) {
        return nonConformityMapper.toResponse(nonConformityService.getById(id));
    }

    @PatchMapping("/non-conformities/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse updateStatus(@PathVariable UUID id,
                                               @Valid @RequestBody NonConformityStatusUpdateRequest request) {
        return nonConformityMapper.toResponse(nonConformityService.updateStatus(id, request));
    }

}
