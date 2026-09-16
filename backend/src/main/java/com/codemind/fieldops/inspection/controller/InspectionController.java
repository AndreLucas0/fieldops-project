package com.codemind.fieldops.inspection.controller;

import com.codemind.fieldops.inspection.application.InspectionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.InspectionPriority;
import com.codemind.fieldops.inspection.domain.InspectionStatus;
import com.codemind.fieldops.inspection.dto.AssignInspectionRequest;
import com.codemind.fieldops.inspection.dto.CancelInspectionRequest;
import com.codemind.fieldops.inspection.dto.InspectionCreateRequest;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.dto.InspectionUpdateRequest;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inspections")
public class InspectionController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("status", "priority", "scheduledFor", "createdAt");

    private final InspectionService inspectionService;
    private final InspectionMapper inspectionMapper;

    public InspectionController(InspectionService inspectionService, InspectionMapper inspectionMapper) {
        this.inspectionService = inspectionService;
        this.inspectionMapper = inspectionMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<InspectionResponse> list(
            @RequestParam(required = false) UUID clientId,
            @RequestParam(required = false) UUID siteId,
            @RequestParam(required = false) UUID technicianId,
            @RequestParam(required = false) InspectionStatus status,
            @RequestParam(required = false) InspectionPriority priority,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<Inspection> inspections = inspectionService.list(clientId, siteId, technicianId, status, priority, pageable);
        return PageResponse.from(inspections.map(inspectionMapper::toResponse));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public InspectionResponse create(@Valid @RequestBody InspectionCreateRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return inspectionMapper.toResponse(inspectionService.create(userId, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public InspectionResponse get(@PathVariable UUID id) {
        return inspectionMapper.toResponse(inspectionService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public InspectionResponse update(@PathVariable UUID id, @Valid @RequestBody InspectionUpdateRequest request) {
        return inspectionMapper.toResponse(inspectionService.update(id, request));
    }

    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public InspectionResponse assign(@PathVariable UUID id, @Valid @RequestBody AssignInspectionRequest request) {
        return inspectionMapper.toResponse(inspectionService.assign(id, request));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public InspectionResponse cancel(@PathVariable UUID id,
                                      @Valid @RequestBody(required = false) CancelInspectionRequest request,
                                      @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return inspectionMapper.toResponse(inspectionService.cancel(id, userId, request));
    }

}
