package com.codemind.fieldops.template.controller;

import com.codemind.fieldops.template.application.TemplateService;
import com.codemind.fieldops.template.domain.TemplateVersion;
import com.codemind.fieldops.template.dto.TemplateVersionResponse;
import com.codemind.fieldops.template.mapper.TemplateMapper;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inspection-template-versions")
public class InspectionTemplateVersionController {

    private final TemplateService templateService;
    private final TemplateMapper templateMapper;

    public InspectionTemplateVersionController(TemplateService templateService, TemplateMapper templateMapper) {
        this.templateService = templateService;
        this.templateMapper = templateMapper;
    }

    @GetMapping("/{versionId}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public TemplateVersionResponse getVersion(@PathVariable UUID versionId) {
        TemplateVersion version = templateService.getVersion(versionId);
        return templateMapper.toVersionResponse(version);
    }

}
