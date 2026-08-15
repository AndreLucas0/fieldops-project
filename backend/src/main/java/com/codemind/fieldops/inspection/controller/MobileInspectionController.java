package com.codemind.fieldops.inspection.controller;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.dto.ItemSnapshotDto;
import com.codemind.fieldops.inspection.dto.MobileInspectionDetailResponse;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.inspection.mapper.InspectionResponseMapper;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.shared.pagination.PageResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/mobile/inspections")
public class MobileInspectionController {

    private final InspectionExecutionService executionService;
    private final InspectionMapper inspectionMapper;
    private final InspectionResponseMapper responseMapper;
    private final ItemSnapshotRepository itemSnapshotRepository;

    public MobileInspectionController(InspectionExecutionService executionService,
                                       InspectionMapper inspectionMapper,
                                       InspectionResponseMapper responseMapper,
                                       ItemSnapshotRepository itemSnapshotRepository) {
        this.executionService = executionService;
        this.inspectionMapper = inspectionMapper;
        this.responseMapper = responseMapper;
        this.itemSnapshotRepository = itemSnapshotRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('TECHNICIAN')")
    public PageResponse<InspectionResponse> listMyInspections(@AuthenticationPrincipal Jwt jwt,
                                                               @PageableDefault(size = 20) Pageable pageable) {
        UUID technicianId = UUID.fromString(jwt.getSubject());
        Page<Inspection> inspections = executionService.listForTechnician(technicianId, pageable);
        return PageResponse.from(inspections.map(inspectionMapper::toResponse));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public MobileInspectionDetailResponse getMyInspectionDetail(@PathVariable UUID id,
                                                                  @AuthenticationPrincipal Jwt jwt) {
        UUID technicianId = UUID.fromString(jwt.getSubject());
        Inspection inspection = executionService.getInspectionForTechnician(id, technicianId);

        List<ItemSnapshot> snapshots = itemSnapshotRepository
            .findByInspectionIdOrderBySectionOrderAscItemOrderAsc(id);
        List<ItemSnapshotDto> snapshotDtos = snapshots.stream()
            .map(responseMapper::toSnapshotDto)
            .toList();

        return new MobileInspectionDetailResponse(
            inspection.getId(),
            inspection.getTemplateVersion().getId(),
            inspection.getClient().getId(),
            inspection.getSite().getId(),
            inspection.getEquipment() != null ? inspection.getEquipment().getId() : null,
            inspection.getTechnician().getId(),
            inspection.getTitle(),
            inspection.getInstructions(),
            inspection.getPriority(),
            inspection.getStatus(),
            inspection.getScheduledFor(),
            inspection.getStartedAtServer(),
            inspection.getSubmittedAtServer(),
            inspection.getCreatedAt(),
            inspection.getUpdatedAt(),
            snapshotDtos
        );
    }

}
