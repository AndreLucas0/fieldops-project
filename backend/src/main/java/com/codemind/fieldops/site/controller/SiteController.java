package com.codemind.fieldops.site.controller;

import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import com.codemind.fieldops.site.application.SiteService;
import com.codemind.fieldops.site.domain.InspectionSite;
import com.codemind.fieldops.site.domain.SiteStatus;
import com.codemind.fieldops.site.dto.SiteCreateRequest;
import com.codemind.fieldops.site.dto.SiteResponse;
import com.codemind.fieldops.site.dto.SiteStatusUpdateRequest;
import com.codemind.fieldops.site.dto.SiteUpdateRequest;
import com.codemind.fieldops.site.mapper.SiteMapper;
import jakarta.validation.Valid;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/sites")
public class SiteController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("name", "status", "city", "createdAt");

    private final SiteService siteService;
    private final SiteMapper siteMapper;

    public SiteController(SiteService siteService, SiteMapper siteMapper) {
        this.siteService = siteService;
        this.siteMapper = siteMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<SiteResponse> list(
            @RequestParam(required = false) UUID clientId,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) SiteStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<InspectionSite> sites = siteService.list(clientId, name, status, pageable);
        return PageResponse.from(sites.map(siteMapper::toResponse));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public SiteResponse create(@Valid @RequestBody SiteCreateRequest request) {
        return siteMapper.toResponse(siteService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public SiteResponse get(@PathVariable UUID id) {
        return siteMapper.toResponse(siteService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public SiteResponse update(@PathVariable UUID id, @Valid @RequestBody SiteUpdateRequest request) {
        return siteMapper.toResponse(siteService.update(id, request));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public SiteResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody SiteStatusUpdateRequest request) {
        return siteMapper.toResponse(siteService.updateStatus(id, request.status()));
    }

}
