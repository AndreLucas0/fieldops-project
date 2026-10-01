package com.codemind.fieldops.template.controller;

import com.codemind.fieldops.shared.pagination.PageResponse;
import com.codemind.fieldops.shared.pagination.SortFieldValidator;
import com.codemind.fieldops.template.application.TemplateService;
import com.codemind.fieldops.template.domain.InspectionTemplate;
import com.codemind.fieldops.template.domain.TemplateStatus;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.PublishTemplateRequest;
import com.codemind.fieldops.template.dto.TemplateCreateRequest;
import com.codemind.fieldops.template.dto.TemplateItemRequest;
import com.codemind.fieldops.template.dto.TemplateItemResponse;
import com.codemind.fieldops.template.dto.TemplateResponse;
import com.codemind.fieldops.template.dto.TemplateSectionCreateRequest;
import com.codemind.fieldops.template.dto.TemplateSectionResponse;
import com.codemind.fieldops.template.dto.TemplateUpdateRequest;
import com.codemind.fieldops.template.dto.TemplateVersionResponse;
import com.codemind.fieldops.template.mapper.TemplateMapper;
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
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/templates", "/inspection-templates"})
public class TemplateController {

    private static final Set<String> SORTABLE_FIELDS = Set.of("title", "category", "status", "createdAt");
    private static final Set<String> VERSION_SORTABLE_FIELDS = Set.of("versionNumber", "publishedAt", "createdAt");

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
                                           @Valid @RequestBody(required = false) PublishTemplateRequest request,
                                           @AuthenticationPrincipal Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());
        // Without body (openapi contract) the DRAFT built incrementally is published;
        // the legacy body with the full section list is still accepted.
        TemplateVersion version = request == null
            ? templateService.publishDraft(id, userId)
            : templateService.publish(id, userId, request.sections());
        return templateMapper.toVersionResponse(version);
    }

    @GetMapping("/{id}/sections")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public List<TemplateSectionResponse> listDraftSections(@PathVariable UUID id) {
        return templateService.listDraftSections(id).stream()
            .map(templateMapper::toSectionResponse)
            .toList();
    }

    @PostMapping("/{id}/sections")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateSectionResponse createSection(@PathVariable UUID id,
                                                 @Valid @RequestBody TemplateSectionCreateRequest request) {
        return templateMapper.toSectionResponse(templateService.createSection(id, request));
    }

    @PutMapping("/{id}/sections/{sectionId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateSectionResponse updateSection(@PathVariable UUID id,
                                                 @PathVariable UUID sectionId,
                                                 @Valid @RequestBody TemplateSectionCreateRequest request) {
        return templateMapper.toSectionResponse(templateService.updateSection(id, sectionId, request));
    }

    @PostMapping("/{id}/sections/{sectionId}/items")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateItemResponse createItem(@PathVariable UUID id,
                                           @PathVariable UUID sectionId,
                                           @Valid @RequestBody TemplateItemRequest request) {
        return templateMapper.toItemResponse(templateService.createItem(id, sectionId, request));
    }

    @PutMapping("/{id}/items/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateItemResponse updateItem(@PathVariable UUID id,
                                           @PathVariable UUID itemId,
                                           @Valid @RequestBody TemplateItemRequest request) {
        return templateMapper.toItemResponse(templateService.updateItem(id, itemId, request));
    }

    @GetMapping("/{id}/active-version")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateVersionResponse getActiveVersion(@PathVariable UUID id) {
        TemplateVersion version = templateService.getActiveVersion(id);
        return templateMapper.toVersionResponse(version);
    }

    @GetMapping("/{id}/versions")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<TemplateVersionResponse> listVersions(@PathVariable UUID id,
                                                              @PageableDefault(size = 20) Pageable pageable) {
        SortFieldValidator.validate(pageable.getSort(), VERSION_SORTABLE_FIELDS);
        Page<TemplateVersion> versions = templateService.listVersions(id, pageable);
        return PageResponse.from(versions.map(templateMapper::toVersionResponse));
    }

}
