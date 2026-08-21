package com.codemind.fieldops.template.controller;

import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import com.codemind.fieldops.template.application.TemplateService;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.PublishTemplateRequest;
import com.codemind.fieldops.template.dto.TemplateCreateRequest;
import com.codemind.fieldops.template.dto.TemplateResponse;
import com.codemind.fieldops.template.dto.TemplateUpdateRequest;
import com.codemind.fieldops.template.dto.TemplateVersionResponse;
import com.codemind.fieldops.template.mapper.TemplateMapper;
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
@RequestMapping("/templates")
public class TemplateController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("title", "category", "status", "createdAt");

    private final TemplateService templateService;
    private final TemplateMapper templateMapper;

    public TemplateController(TemplateService templateService, TemplateMapper templateMapper) {
        this.templateService = templateService;
        this.templateMapper = templateMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<TemplateResponse> list(
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) TemplateStatus status,
            @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), SORTABLE_FIELDS);
        Page<InspectionTemplate> templates = templateService.list(title, category, status, pageable);
        return PageResponse.from(templates.map(templateMapper::toResponse));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateResponse create(@Valid @RequestBody TemplateCreateRequest request,
                                   @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        return templateMapper.toResponse(templateService.create(userId, request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateResponse get(@PathVariable UUID id) {
        return templateMapper.toResponse(templateService.getById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateResponse update(@PathVariable UUID id, @Valid @RequestBody TemplateUpdateRequest request) {
        return templateMapper.toResponse(templateService.update(id, request));
    }

    @PostMapping("/{id}/publish")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateVersionResponse publish(@PathVariable UUID id,
                                           @Valid @RequestBody PublishTemplateRequest request,
                                           @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        TemplateVersion version = templateService.publish(id, userId, request.sections());
        return templateMapper.toVersionResponse(version);
    }

    @GetMapping("/{id}/active-version")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateVersionResponse getActiveVersion(@PathVariable UUID id) {
        TemplateVersion version = templateService.getActiveVersion(id);
        return templateMapper.toVersionResponse(version);
    }

}
