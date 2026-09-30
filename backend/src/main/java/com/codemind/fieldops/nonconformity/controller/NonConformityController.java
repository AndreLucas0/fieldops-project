package com.codemind.fieldops.nonconformity.controller;

import com.codemind.fieldops.nonconformity.application.NonConformityService;
import com.codemind.fieldops.nonconformity.domain.NonConformity;
import com.codemind.fieldops.nonconformity.domain.NonConformitySeverity;
import com.codemind.fieldops.nonconformity.domain.NonConformityStatus;
import com.codemind.fieldops.nonconformity.dto.NonConformityCreateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityResponse;
import com.codemind.fieldops.nonconformity.dto.NonConformityStatusUpdateRequest;
import com.codemind.fieldops.nonconformity.dto.NonConformityUpdateRequest;
import com.codemind.fieldops.nonconformity.mapper.NonConformityMapper;
import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.security.JwtClaims;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class NonConformityController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("createdAt", "severity", "status");

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
        NonConformity nc = nonConformityService.create(inspectionId, userId, isTechnician(jwt), request);
        return nonConformityMapper.toResponse(nc);
    }

    @GetMapping("/inspections/{inspectionId}/non-conformities")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public List<NonConformityResponse> listByInspection(@PathVariable UUID inspectionId,
                                                        @AuthenticationPrincipal Jwt jwt) {
        return nonConformityService.listByInspection(inspectionId, UUID.fromString(jwt.getSubject()), isTechnician(jwt))
            .stream()
            .map(nonConformityMapper::toResponse)
            .toList();
    }

    @GetMapping("/non-conformities/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse getById(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return nonConformityMapper.toResponse(
            nonConformityService.getById(id, UUID.fromString(jwt.getSubject()), isTechnician(jwt)));
    }

    @PatchMapping("/non-conformities/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse updateStatus(@PathVariable UUID id,
                                               @Valid @RequestBody NonConformityStatusUpdateRequest request,
                                               @AuthenticationPrincipal Jwt jwt) {
        return nonConformityMapper.toResponse(
            nonConformityService.updateStatus(id, request, UUID.fromString(jwt.getSubject()), isTechnician(jwt)));
    }

    @GetMapping("/non-conformities")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<NonConformityResponse> list(
            @RequestParam(required = false) UUID inspectionId,
            @RequestParam(required = false) NonConformitySeverity severity,
            @RequestParam(required = false) NonConformityStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<NonConformity> page = nonConformityService.list(inspectionId, severity, status, pageable);
        return PageResponse.from(page.map(nonConformityMapper::toResponse));
    }

    @PutMapping("/non-conformities/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR','TECHNICIAN')")
    public NonConformityResponse update(@PathVariable UUID id,
                                         @Valid @RequestBody NonConformityUpdateRequest request,
                                         @AuthenticationPrincipal Jwt jwt) {
        return nonConformityMapper.toResponse(
            nonConformityService.update(id, request, UUID.fromString(jwt.getSubject()), isTechnician(jwt)));
    }

    private static boolean isTechnician(Jwt jwt) {
        return "TECHNICIAN".equals(jwt.getClaimAsString(JwtClaims.ROLE));
    }

}
