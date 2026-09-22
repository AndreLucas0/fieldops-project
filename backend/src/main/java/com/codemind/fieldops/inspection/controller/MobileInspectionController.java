package com.codemind.fieldops.inspection.controller;

import com.codemind.fieldops.inspection.application.InspectionExecutionService;
import com.codemind.fieldops.inspection.domain.Inspection;
import com.codemind.fieldops.inspection.domain.ItemSnapshot;
import com.codemind.fieldops.inspection.dto.InspectionResponse;
import com.codemind.fieldops.inspection.dto.ItemSnapshotDto;
import com.codemind.fieldops.inspection.dto.MobileInspectionDetailResponse;
import com.codemind.fieldops.inspection.dto.MobileInspectionResponseDto;
import com.codemind.fieldops.inspection.mapper.InspectionMapper;
import com.codemind.fieldops.inspection.mapper.InspectionResponseMapper;
import com.codemind.fieldops.inspection.repository.InspectionResponseRepository;
import com.codemind.fieldops.inspection.repository.ItemSnapshotRepository;
import com.codemind.fieldops.nonconformity.dto.MobileNonConformityDto;
import com.codemind.fieldops.nonconformity.mapper.NonConformityMapper;
import com.codemind.fieldops.nonconformity.repository.NonConformityRepository;
import com.codemind.fieldops.review.dto.InspectionReviewResponse;
import com.codemind.fieldops.review.mapper.InspectionReviewMapper;
import com.codemind.fieldops.review.repository.InspectionReviewRepository;
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
    private final InspectionResponseRepository inspectionResponseRepository;
    private final NonConformityRepository nonConformityRepository;
    private final NonConformityMapper nonConformityMapper;
    private final InspectionReviewRepository inspectionReviewRepository;
    private final InspectionReviewMapper inspectionReviewMapper;

    public MobileInspectionController(InspectionExecutionService executionService,
                                       InspectionMapper inspectionMapper,
                                       InspectionResponseMapper responseMapper,
                                       ItemSnapshotRepository itemSnapshotRepository,
                                       InspectionResponseRepository inspectionResponseRepository,
                                       NonConformityRepository nonConformityRepository,
                                       NonConformityMapper nonConformityMapper,
                                       InspectionReviewRepository inspectionReviewRepository,
                                       InspectionReviewMapper inspectionReviewMapper) {
        this.executionService = executionService;
        this.inspectionMapper = inspectionMapper;
        this.responseMapper = responseMapper;
        this.itemSnapshotRepository = itemSnapshotRepository;
        this.inspectionResponseRepository = inspectionResponseRepository;
        this.nonConformityRepository = nonConformityRepository;
        this.nonConformityMapper = nonConformityMapper;
        this.inspectionReviewRepository = inspectionReviewRepository;
        this.inspectionReviewMapper = inspectionReviewMapper;
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

        List<ItemSnapshotDto> items = itemSnapshotRepository
            .findByInspectionIdOrderBySectionOrderAscItemOrderAsc(id)
            .stream()
            .map(responseMapper::toSnapshotDto)
            .toList();

        List<MobileInspectionResponseDto> responses = inspectionResponseRepository
            .findByInspectionId(id)
            .stream()
            .map(responseMapper::toMobileResponseDto)
            .toList();

        List<MobileNonConformityDto> nonConformities = nonConformityRepository
            .findByInspectionId(id)
            .stream()
            .map(nonConformityMapper::toMobileDto)
            .toList();

        List<InspectionReviewResponse> reviews = inspectionReviewRepository
            .findByInspectionIdOrderByReviewCycleAsc(id)
            .stream()
            .map(inspectionReviewMapper::toResponse)
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
            items,
            responses,
            nonConformities,
            reviews
        );
    }

}
