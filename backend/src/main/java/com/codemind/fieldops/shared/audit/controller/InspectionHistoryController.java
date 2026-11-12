package com.codemind.fieldops.shared.audit.controller;

import com.codemind.fieldops.shared.audit.application.InspectionHistoryService;
import com.codemind.fieldops.shared.audit.dto.AuditEventResponse;
import com.codemind.fieldops.shared.audit.mapper.AuditEventMapper;
import com.codemind.fieldops.shared.pagination.PageResponse;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inspections/{inspectionId}/history")
public class InspectionHistoryController {

    private final InspectionHistoryService historyService;
    private final AuditEventMapper auditEventMapper;

    public InspectionHistoryController(InspectionHistoryService historyService, AuditEventMapper auditEventMapper) {
        this.historyService = historyService;
        this.auditEventMapper = auditEventMapper;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','SUPERVISOR')")
    public PageResponse<AuditEventResponse> list(@PathVariable UUID inspectionId,
            @PageableDefault(size = 20) Pageable pageable) {
        Page<AuditEventResponse> events = historyService.list(inspectionId, pageable).map(auditEventMapper::toResponse);
        return PageResponse.from(events);
    }

}
